// Logica pura (testabile in Node): riceve una Request e le dipendenze.
export async function handle(req, env, f) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const out = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return out({ error: 'metodo non consentito' }, 405);
  const url = env.SUPABASE_URL;
  let key = env.SUPABASE_SERVICE_ROLE_KEY;
  try { if (env.SUPABASE_SECRET_KEYS) key = JSON.parse(env.SUPABASE_SECRET_KEYS).default || key; } catch {}
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const admin = { apikey: key, Authorization: 'Bearer ' + key };
  // utente
  const ur = await f(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + jwt } });
  if (!ur.ok) return out({ error: 'non autorizzato' }, 401);
  const uid = (await ur.json()).id;
  let b; try { b = await req.json(); } catch { return out({ error: 'richiesta non valida' }, 400); }
  const to = String(b.to || '');
  const isTpl = b.action === 'create_template';
  if (!isTpl && !/^\+[1-9]\d{7,14}$/.test(to)) return out({ error: 'numero destinatario non valido' }, 400);
  const sr = await f(url + '/rest/v1/app_settings?select=data&user_id=eq.' + uid, { headers: admin });
  const cfg = ((await sr.json())[0] || {}).data || {};
  if (!isTpl && !cfg.enabled) return out({ error: 'invio WhatsApp non abilitato nelle Impostazioni' }, 400);
  if (!isTpl && !/^\+[1-9]\d{7,14}$/.test(cfg.from || '')) return out({ error: 'numero mittente non configurato' }, 400);
  const sec = async k => { const r = await f(url + '/rest/v1/rpc/app_get_secret', { method: 'POST', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, k }) }); return r.ok ? await r.json() : null; };
  const [acc, ksid, ksec] = [await sec('twilio_account_sid'), await sec('twilio_key_sid'), await sec('twilio_key_secret')];
  if (!acc || !ksid || !ksec) return out({ error: 'credenziali Twilio non configurate nelle Impostazioni' }, 400);
  const fill = (t, v) => String(t || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (v && v[k]) ?? '');
  if (b.action === 'create_template') {
    const name = String(b.name || '').trim();
    if (!/^[a-z][a-z0-9_]{2,59}$/.test(name)) return out({ error: 'nome template non valido: usa minuscole, numeri e _ (es. resoconto_inquilino)' }, 400);
    const text = String(b.text || '').trim();
    const order = []; text.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!order.includes(k)) order.push(k); return m; });
    const SAMPLE = { nome: 'Mario', cognome: 'Rossi', periodo: 'dal 01-01-2026 al 31-01-2026', appartamento: 'Casa' };
    if (order.some(k => !(k in SAMPLE))) return out({ error: 'segnaposto non valido: usa {{nome}} {{cognome}} {{periodo}} {{appartamento}}' }, 400);
    if (!text || /^\{\{\w+\}\}|\{\{\w+\}\}$/.test(text) || /\}\}\s*\{\{/.test(text)) return out({ error: 'il testo non può iniziare o finire con un segnaposto, né averne due vicini' }, 400);
    const variables = {}, contentVars = {};
    order.forEach((k, i) => { variables[String(i + 1)] = SAMPLE[k]; contentVars[String(i + 1)] = '{{' + k + '}}'; });
    let body = text; order.forEach((k, i) => { body = body.split('{{' + k + '}}').join('{{' + (i + 1) + '}}'); });
    let types, mediaVar = null;
    if (b.media) {
      mediaVar = String(order.length + 1);
      variables[mediaVar] = 'object/sign/report-whatsapp/esempio/esempio.pdf';
      types = { 'twilio/media': { body, media: [url + '/storage/v1/{{' + mediaVar + '}}'] } };
    } else types = { 'twilio/text': { body } };
    const auth = { Authorization: 'Basic ' + btoa(ksid + ':' + ksec), 'Content-Type': 'application/json' };
    const cr = await f('https://content.twilio.com/v1/Content', { method: 'POST', headers: auth, body: JSON.stringify({ friendly_name: name, language: 'it', variables, types }) });
    const cj = await cr.json().catch(() => ({}));
    if (!cr.ok) return out({ error: 'Twilio: ' + (cj.message || cr.status) }, 502);
    let approval = null;
    if (b.submit) {
      const ar = await f('https://content.twilio.com/v1/Content/' + cj.sid + '/ApprovalRequests/whatsapp', { method: 'POST', headers: auth, body: JSON.stringify({ name, category: ['UTILITY', 'MARKETING', 'AUTHENTICATION'].includes(b.category) ? b.category : 'UTILITY' }) });
      const aj = await ar.json().catch(() => ({}));
      approval = ar.ok ? (aj.status || 'inviato') : 'errore: ' + (aj.message || ar.status);
    }
    return out({ sid: cj.sid, contentVars: JSON.stringify(contentVars), mediaVar, approval });
  }
  const vars = b.vars || {};
  const form = new URLSearchParams({ From: 'whatsapp:' + cfg.from, To: 'whatsapp:' + to });
  let filename = b.name || null;
  if (b.test) {
    filename = 'prova';
    if (cfg.mode === 'template') {
      if (!/^HX/.test(cfg.contentSid || '')) return out({ error: 'Content SID non impostato' }, 400);
      if (cfg.mediaVar) return out({ error: 'il template contiene un PDF: provalo con un invio da un report' }, 400);
      form.set('ContentSid', cfg.contentSid);
      let cv; try { cv = JSON.parse(fill(cfg.contentVars, { nome: 'Prova', cognome: 'Prova', periodo: 'dal 01-01-2026 al 31-01-2026', appartamento: 'Casa' })); } catch { return out({ error: 'variabili del template non valide' }, 400); }
      form.set('ContentVariables', JSON.stringify(cv));
    } else form.set('Body', 'Messaggio di prova da Affitti Studenti ✓');
  }
  else {
    const path = String(b.path || '');
    if (!path.startsWith(uid + '/') || path.includes('..')) return out({ error: 'percorso file non valido' }, 400);
    const sg = await f(url + '/storage/v1/object/sign/report-whatsapp/' + path, { method: 'POST', headers: { ...admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 600 }) });
    if (!sg.ok) return out({ error: 'PDF non trovato' }, 400);
    const su = (await sg.json()).signedURL;
    if (!(cfg.mode === 'template' && cfg.mediaVar)) form.set('MediaUrl', url + '/storage/v1' + su);
    if (cfg.mode === 'template') {
      form.set('ContentSid', cfg.contentSid || '');
      let cv; try { cv = JSON.parse(fill(cfg.contentVars, vars)); } catch { return out({ error: 'variabili del template non valide' }, 400); }
      if (cfg.mediaVar) cv[String(cfg.mediaVar)] = su.replace(/^\//, '');
      form.set('ContentVariables', JSON.stringify(cv));
    } else form.set('Body', fill(cfg.text, vars));
  }
  const tr = await f('https://api.twilio.com/2010-04-01/Accounts/' + acc + '/Messages.json', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(ksid + ':' + ksec), 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const tj = await tr.json().catch(() => ({}));
  const log = { user_id: uid, to_number: to, filename, sid: tj.sid || null, status: tr.ok ? tj.status : 'errore', error: tr.ok ? null : (tj.message || 'HTTP ' + tr.status) };
  await f(url + '/rest/v1/whatsapp_log', { method: 'POST', headers: { ...admin, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(log) });
  if (!tr.ok) return out({ error: 'Twilio: ' + (tj.message || tr.status) }, 502);
  // pulizia best effort del PDF
  if (!b.test) f(url + '/storage/v1/object/report-whatsapp/' + b.path, { method: 'DELETE', headers: admin }).catch(() => {});
  return out({ sid: tj.sid, status: tj.status });
}
