// Invio WhatsApp tramite Twilio (logica, senza interfaccia)
import { authToken, getSession, httpErr, newUid, sb } from './cloud-supabase.js';
import { gm, sm } from './db.js';
import { pdfDoc } from './lib-pdf.js';
import { st } from './state.js';
import { fd } from './util.js';

const WA_DEF = {enabled:false,from:'',prefix:'+39',mode:'free',contentSid:'',contentVars:'{"1":"{{nome}}","2":"{{periodo}}"}',mediaVar:'',text:'Ciao {{nome}}, ti invio il resoconto {{periodo}} per l’appartamento {{appartamento}}. Grazie!',confirm:true};
export const WA_KEYS = [['twilio_account_sid','Account SID (inizia con AC…)'],['twilio_key_sid','API Key SID (inizia con SK…)'],['twilio_key_secret','API Key Secret']];
export function normPhone(raw,prefix){let t=String(raw||'').trim().replace(/[\s().\-\/]/g,'');if(t.startsWith('00'))t='+'+t.slice(2);if(!t.startsWith('+')){const pf=String(prefix||'+39').trim();t=pf+t.replace(/^0+(?=\d{6,})/,pf=='+39'?'':'')}
 return/^\+[1-9]\d{7,14}$/.test(t)?t:null}
const waFill = (tpl,v)=>String(tpl||'').replace(/\{\{(\w+)\}\}/g,(m,k)=>v[k]??'');
function waVars(R){const t=R.tenant,p=R.p;return{nome:t?t.first_name:'',cognome:t?t.last_name:'',periodo:'dal '+fd(p.from)+' al '+fd(p.to),appartamento:R.apt||'(tutti)'}}
export async function waLoad(s){let cfg=(await gm('waSet'))||null,sec=null,online=true;
 try{const r=await sb('/rest/v1/app_settings?select=data',{headers:{Accept:'application/json'}},s.at);if(!r.ok)throw await httpErr(r);const a=await r.json();if(a[0]){cfg=a[0].data;await sm('waSet',cfg)}
  const r2=await sb('/rest/v1/rpc/app_secret_status',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},s.at);if(r2.ok)sec=await r2.json();else if(r2.status==404)sec={_missing:true}}
 catch(e){online=false;if(e.kind=='setup')sec={_missing:true}}
 return{cfg:{...WA_DEF,...(cfg||{})},sec,online}}
export async function waCall(payload){const ss=await authToken();const r=await sb('/functions/v1/send-whatsapp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},ss.at);
 let j={};try{j=await r.json()}catch{}if(r.status==404)throw'Funzione send-whatsapp non trovata: va pubblicata su Supabase (vedi guida)';if(!r.ok||j.error)throw j.error||('Errore invio ('+r.status+')');return j}
export async function waSend(){const R=st.LASTREP;try{if(!R||!R.tenant)throw'Il report deve riguardare un singolo inquilino';const s=await getSession();if(!s)throw'Accedi dal menù Impostazioni';
  const{cfg}=await waLoad(s);if(!cfg.enabled||!cfg.from)throw'Invio WhatsApp non configurato: vai in Impostazioni → Invio WhatsApp';
  const to=normPhone(R.tenant.phone,cfg.prefix);if(!to)throw'Numero di telefono dell’inquilino mancante o non valido (menù Inquilini)';
  const v=waVars(R),txt=waFill(cfg.text,v);
  if(cfg.confirm&&!confirm(`Inviare su WhatsApp a ${R.tenant.first_name} ${R.tenant.last_name} (${to}) il file ${R.name}?\n\n${cfg.mode=='free'?txt:'(messaggio da template)'}`))return;
  const btn=document.querySelector('button.wa');if(btn){btn.disabled=true;btn.textContent='Invio…'}
  try{const ss=await authToken(),path=`${ss.uid}/${newUid()}.pdf`,pdf=pdfDoc(R.blocks,R.title);
   const up=await sb(`/storage/v1/object/report-whatsapp/${path}`,{method:'POST',headers:{'Content-Type':'application/pdf'},body:pdf},ss.at);if(!up.ok)throw'PDF non caricato: '+(await httpErr(up)).message;
   const res=await waCall({to,path,vars:v,name:R.name});alert('Messaggio inviato a '+to+' (stato: '+(res.status||'in coda')+').')}
  finally{if(btn){btn.disabled=false;btn.textContent='Invia su WhatsApp'}}}
 catch(e){alert(typeof e==='string'?e:'Errore: '+(e?.message||e))}}
