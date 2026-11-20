// Collegamento a Supabase: accesso, errori, richieste
import { gm, sm } from './db.js';

const SB_URL = 'https://ykbdsvwydlsvdollzpqe.supabase.co';
const SB_KEY = 'sb_publishable_OKbJkKUM3TnRJCR4ISB6xg_mZIdaqfp';
export const ce = (kind,msg)=>Object.assign(new Error(msg),{kind});
export const newUid = ()=>typeof crypto!='undefined'&&crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16));
const devName = ()=>{const u=navigator.userAgent;return/iPhone/.test(u)?'iPhone':/iPad/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1)?'iPad':/Android/.test(u)?'Android':'Computer'};
export const sb = async(path,opt={},tok)=>{try{return await fetch(SB_URL+path,{...opt,headers:{apikey:SB_KEY,...(tok?{Authorization:'Bearer '+tok}:{}),...(opt.headers||{})}})}catch{throw ce('net','Nessuna connessione')}};
export const httpErr = async r=>{let t='';try{t=await r.text()}catch{}if(r.status==404&&/PGRST205|PGRST106|relation|schema cache/.test(t))return ce('setup','Il database non è ancora pronto: esegui lo script SQL 002_tabelle.sql su Supabase');
  if(/PGRST204/.test(t))return ce('setup','Struttura del database non aggiornata: riesegui lo script SQL 002_tabelle.sql');if(r.status==401||r.status==403)return ce('login','Sessione non valida: accedi di nuovo');
  return ce(r.status>=500?'net':'http','Errore del cloud ('+r.status+')'+(r.status>=500?'. Se il progetto è gratuito potrebbe essere in pausa: riattivalo da supabase.com':'')+(r.status<500&&t?' · '+t.slice(0,160):''))};
const mkSess = j=>({at:j.access_token,rt:j.refresh_token,exp:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),uid:j.user.id,email:j.user.email});
export const getSession = async()=>(await gm('session'))||null;
export async function authToken(){let s=await getSession();if(!s)throw ce('login','Accedi dal menù Impostazioni');if(s.exp-60>Date.now()/1000)return s;
 const r=await sb('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.rt})});
 if(!r.ok){if(r.status>=400&&r.status<500){await sm('session',null);throw ce('login','Sessione scaduta: accedi di nuovo')}throw await httpErr(r)}
 s=mkSess(await r.json());await sm('session',s);return s}
export async function cloudLogin(email,pw){const r=await sb('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})});
 if(r.status==400||r.status==401||r.status==422)throw ce('auth','Email o password non corretti');if(!r.ok)throw await httpErr(r);await sm('session',mkSess(await r.json()))}
