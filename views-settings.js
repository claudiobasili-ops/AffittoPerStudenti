// Menù Impostazioni: account, sincronizzazione, WhatsApp
import { authToken, cloudLogin, getSession, httpErr, sb } from './cloud-supabase.js';
import { cloudLine, syncNow } from './cloud-sync.js';
import { WA_KEYS, normPhone, waCall, waLoad } from './cloud-whatsapp.js';
import { sm } from './db.js';
import { SYNC } from './state.js';
import { $, esc } from './util.js';

export async function cloudView(msg){const s=await getSession(),cl=await cloudLine(),bad=SYNC.msg&&!['ok','syncing','off'].includes(SYNC.state)&&SYNC.msg!='Nessuna connessione';
 $('#main').innerHTML=`<h2>Impostazioni</h2><h3>Account e sincronizzazione</h3>`+(s?`<div class=card><p>Collegato come <strong>${esc(s.email)}</strong></p><p>Stato: <strong id=cloudline>${esc(cl)}</strong></p>${SYNC.info?`<p class=mut>Ultima sincronizzazione: ${esc(SYNC.info)}</p>`:''}${bad?`<p class=okm style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5">${esc(SYNC.msg)}</p>`:''}${msg?`<p class=okm>${esc(msg)}</p>`:''}
  <button type=button id=csync>Sincronizza ora</button> <button type=button class=sec id=cout>Esci</button>${SYNC.state=='conflict'?' <button type=button id=cres>Risolvi ora</button>':''}
  <details style="margin-top:12px"><summary><strong>Avanzate</strong></summary><p class=mut>Usa questi comandi solo se sai cosa stai facendo: sostituiscono i dati di una delle due parti.</p><button type=button class=sec id=cpush>Invia questo dispositivo al cloud</button> <button type=button class=sec id=cpull>Scarica dal cloud su questo dispositivo</button></details></div>`
  :`<div class=card><p>Accedi per tenere i dati allineati tra iPhone, iPad e computer. L’app funziona anche senza connessione e sincronizza quando torna la rete.</p><label>Email<input id=ce type=email autocomplete=username autocapitalize=off></label><label>Password<input id=cp type=password autocomplete=current-password></label><button type=button id=cin>Accedi</button>${msg?`<p class=okm style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5">${esc(msg)}</p>`:''}</div>`)
  +`<p class=mut>Il cloud non sostituisce il backup: continua a esportare ogni tanto un file di backup (pulsante Backup).</p><div id=wa></div>`;
 const go=async f=>{try{await f()}catch(e){cloudView(e.message||String(e))}};
 if(!s){$('#cin').onclick=()=>go(async()=>{await cloudLogin($('#ce').value.trim(),$('#cp').value);SYNC.state='syncing';await cloudView();await syncNow(true)});$('#cp').onkeydown=e=>{if(e.key=='Enter')$('#cin').click()}}
 else{$('#csync').onclick=async()=>{await syncNow(true)};$('#cout').onclick=async()=>{if(confirm('Uscire dal cloud? I dati restano su questo dispositivo.')){await sm('session',null);SYNC.state='off';SYNC.msg='';cloudView()}};
  if($('#cres'))$('#cres').onclick=()=>syncNow(true);
  $('#cpush').onclick=()=>go(async()=>{if(!confirm('Sostituire i dati nel cloud con quelli di questo dispositivo?'))return;await sm('forceMode','local');await syncNow(true)});
  $('#cpull').onclick=()=>go(async()=>{if(!confirm('Sostituire i dati di questo dispositivo con quelli del cloud?'))return;await sm('forceMode','cloud');await syncNow(true)})}
 waSettings(s)}
async function waSettings(s){const box=$('#wa');if(!box)return;
 if(!s){box.innerHTML='<h3>Invio WhatsApp</h3><div class=card><p class=mut>Accedi (sezione qui sopra) per configurare l’invio WhatsApp: le impostazioni sono salvate nel tuo database.</p></div>';return}
 box.innerHTML='<h3>Invio WhatsApp</h3><div class=card><p class=mut>Caricamento…</p></div>';
 const{cfg,sec,online}=await waLoad(s);if(!$('#wa'))return;const has=k=>sec&&sec[k]===true,miss=sec&&sec._missing;
 box.innerHTML=`<h3>Invio WhatsApp</h3><div class=card>${!online?'<p class=mut>Offline: mostro le ultime impostazioni note; per salvare serve la connessione.</p>':''}${miss?'<p class=okm style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5">Database non pronto: esegui lo script SQL 003_whatsapp.sql su Supabase.</p>':''}
 <label><input type=checkbox id=wen ${cfg.enabled?'checked':''}> Abilita l’invio WhatsApp dal report</label>
 <label>Numero mittente WhatsApp (formato +39…; per la sandbox Twilio: +14155238886)<input id=wfrom type=tel value="${esc(cfg.from)}" placeholder="+14155238886"></label>
 <label>Prefisso predefinito per i numeri senza prefisso<input id=wpf value="${esc(cfg.prefix)}" style="max-width:8em"></label>
 <label>Modalità<select id=wmode><option value=free ${cfg.mode=='free'?'selected':''}>Testo libero (sandbox, o entro 24 ore dall’ultimo messaggio del destinatario)</option><option value=template ${cfg.mode=='template'?'selected':''}>Template approvato (produzione)</option></select></label>
 <label>Testo del messaggio (segnaposto: {{nome}} {{cognome}} {{periodo}} {{appartamento}})<textarea id=wtext rows=3 style="width:100%;font:inherit;font-size:16px;padding:10px;border-radius:10px;border:1px solid #cbd5e1">${esc(cfg.text)}</textarea></label>
 <div id=wtpl style="${cfg.mode=='template'?'':'display:none'}"><label>Content SID del template (inizia con HX…)<input id=wsid value="${esc(cfg.contentSid)}"></label>
 <label>Variabili del template (JSON, con segnaposto)<input id=wvars value="${esc(cfg.contentVars)}"></label>
 <label>Variabile del PDF (vuoto se il template non contiene il PDF)<input id=wmv value="${esc(cfg.mediaVar||'')}" style="max-width:6em"></label>
 <details style="margin-top:8px"><summary><strong>Crea un template su Twilio</strong></summary>
 <p class=mut>Crea il template partendo dal “Testo del messaggio” qui sopra (salvalo prima). Il testo non può iniziare o finire con un segnaposto né averne due vicini. Dopo la creazione i campi qui sopra si compilano da soli: premi poi “Salva impostazioni”.</p>
 <label>Nome del template (minuscole, numeri e _)<input id=wtn value="resoconto_inquilino" autocapitalize=off></label>
 <label><input type=checkbox id=wtm checked> Includi il PDF come allegato del template</label>
 <label><input type=checkbox id=wts checked> Invia subito a WhatsApp per l’approvazione</label>
 <label>Categoria<select id=wtc><option value=UTILITY>Utility (informativo)</option><option value=MARKETING>Marketing</option></select></label>
 <button type=button class=sec id=wtcreate>Crea template</button><span id=wmsg4></span></details></div>
 <label><input type=checkbox id=wcf ${cfg.confirm?'checked':''}> Chiedi conferma prima di inviare</label>
 <button type=button id=wsave>Salva impostazioni</button><span id=wmsg></span>
 <details ${has('twilio_account_sid')&&has('twilio_key_sid')&&has('twilio_key_secret')?'':'open'} style="margin-top:12px"><summary><strong>Credenziali Twilio</strong> ${WA_KEYS.every(k=>has(k[0]))?'<span class=okm>configurate ✓</span>':'<span class=mut>da inserire</span>'}</summary>
 <p class=mut>Le credenziali vengono salvate cifrate sul server e non possono più essere lette dall’app: per cambiarle inserisci di nuovo il valore. Lascia vuoto ciò che non vuoi cambiare.</p>
 ${WA_KEYS.map(([k,l])=>`<label>${l} ${has(k)?'<span class=okm>✓ impostato</span>':''}<input id=wk_${k} type=password autocomplete=off autocapitalize=off placeholder="${has(k)?'•••••••• (invariato)':''}"></label>`).join('')}
 <button type=button id=wsec>Salva credenziali</button><span id=wmsg2></span></details>
 <details style="margin-top:12px"><summary><strong>Messaggio di prova</strong></summary><p class=mut>Invia un breve testo al tuo numero (con la sandbox devi prima aver inviato il codice “join …” al numero Twilio).</p><label>Numero destinatario<input id=wtest type=tel placeholder="+39…"></label><button type=button class=sec id=wtb>Invia messaggio di prova</button><span id=wmsg3></span></details></div>`;
 const say=(id,t,bad)=>{const e=$('#'+id);if(e)e.innerHTML=t?`<p class=okm ${bad?'style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5"':''}>${esc(t)}</p>`:''};
 $('#wmode').onchange=()=>{$('#wtpl').style.display=$('#wmode').value=='template'?'':'none'};
 $('#wsave').onclick=async()=>{try{const d={enabled:$('#wen').checked,from:$('#wfrom').value.trim(),prefix:$('#wpf').value.trim()||'+39',mode:$('#wmode').value,contentSid:$('#wsid').value.trim(),contentVars:$('#wvars').value.trim(),mediaVar:$('#wmv').value.trim(),text:$('#wtext').value,confirm:$('#wcf').checked};
   if(d.from&&!normPhone(d.from,d.prefix))throw'Numero mittente non valido (esempio: +14155238886)';if(d.mode=='template'){if(!/^HX/.test(d.contentSid))throw'Content SID non valido (inizia con HX)';try{JSON.parse(d.contentVars)}catch{throw'Le variabili del template devono essere JSON valido'}}
   const ss=await authToken(),r=await sb('/rest/v1/app_settings?on_conflict=user_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:ss.uid,data:d})},ss.at);
   if(!r.ok)throw(await httpErr(r)).message;await sm('waSet',d);say('wmsg','Impostazioni salvate')}catch(e){say('wmsg',e.message||String(e),1)}};
 $('#wtcreate').onclick=async()=>{try{const text=$('#wtext').value.trim();say('wmsg4','Creazione in corso…');
   const r=await waCall({action:'create_template',name:$('#wtn').value.trim(),text,media:$('#wtm').checked,submit:$('#wts').checked,category:$('#wtc').value});
   $('#wsid').value=r.sid;$('#wvars').value=r.contentVars;$('#wmv').value=r.mediaVar||'';$('#wmode').value='template';$('#wtpl').style.display='';
   say('wmsg4','Template creato ('+r.sid+')'+(r.approval?' · approvazione: '+r.approval:'')+'. Premi “Salva impostazioni”.')}catch(e){say('wmsg4',e.message||String(e),1)}};
 $('#wsec').onclick=async()=>{try{let n=0;const ss=await authToken();for(const[k]of WA_KEYS){const v=$('#wk_'+k).value.trim();if(!v)continue;
    if(k=='twilio_account_sid'&&!/^AC/.test(v))throw'L’Account SID deve iniziare con AC';if(k=='twilio_key_sid'&&!/^SK/.test(v))throw'L’API Key SID deve iniziare con SK';
    const r=await sb('/rest/v1/rpc/app_set_secret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({k,v})},ss.at);if(!r.ok)throw(await httpErr(r)).message;n++}
   if(!n)throw'Nessun valore inserito';say('wmsg2',n+' credenziali salvate (cifrate)');setTimeout(()=>waSettings(s),900)}catch(e){say('wmsg2',e.message||String(e),1)}};
 $('#wtb').onclick=async()=>{try{const to=normPhone($('#wtest').value,$('#wpf').value);if(!to)throw'Numero non valido';say('wmsg3','Invio…');const r=await waCall({test:true,to});say('wmsg3','Inviato ('+(r.status||'ok')+', '+r.sid+')')}catch(e){say('wmsg3',e.message||String(e),1)}}}
