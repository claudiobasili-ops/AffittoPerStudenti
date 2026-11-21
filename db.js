// Database locale (IndexedDB) e metadati
import { backupUI, lastExp } from './backup.js';
import { newUid } from './cloud-supabase.js';
import { schedSync, syncNow } from './cloud-sync.js';
import { TABLES } from './schema.js';
import { st } from './state.js';
import { loadApc } from './ui.js';

export const P = r=>new Promise((ok,ko)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)});
export const all = t=>P(st.DB.transaction(t).objectStore(t).getAll());
export const get = (t,id)=>P(st.DB.transaction(t).objectStore(t).get(id));
export const put = async(t,o,q)=>{if(!o.gid&&o.id!=null){const old=await P(st.DB.transaction(t).objectStore(t).get(o.id));if(old){o.gid=old.gid;o.rv=old.rv}}
  if(!o.gid)o.gid=t=='documents'?(o.uid||newUid()):newUid();if(t=='documents')o.uid=o.gid;if(!q)o.dt=Date.now();
  const id=await P(st.DB.transaction(t,'readwrite').objectStore(t).put(o));if(!q)await touch();if(t=='apartments')await loadApc();return{...o,id}};
export const gm = async k=>(await P(st.DB.transaction('meta').objectStore('meta').get(k)))?.v;
export const sm = (k,v)=>P(st.DB.transaction('meta','readwrite').objectStore('meta').put({k,v}));
export const touch = async()=>{await sm('lastModified',new Date().toISOString());schedSync()};
// 2.3.0: «Manutenzione» diventa «Manutenzione ordinaria»; aggiunte «Manutenzione straordinaria» e «Rata mutuo». 2.3.1: aggiunta «IMU».
// Le modifiche sono marcate come da sincronizzare, così il cloud conosce le nuove tipologie.
async function migrateTypes(){const T=await all('expense_types'),by=n=>T.find(t=>(t.name||'').trim().toLowerCase()===n.toLowerCase()),old=by('Manutenzione'),ord=by('Manutenzione ordinaria');
 if(old&&!ord)await put('expense_types',{...old,name:'Manutenzione ordinaria'});
 else if(old&&ord){for(const e of(await all('expenses')).filter(e=>e.type_id===old.id))await put('expenses',{...e,type_id:ord.id});
  if(old.gid&&old.rv!=null)await sm('tomb',[...((await gm('tomb'))||[]),{t:'expense_types',gid:old.gid,dt:Date.now()}]);await rawDel('expense_types',old.id);await touch()}
 for(const n of['Manutenzione straordinaria','Rata mutuo','IMU'])if(!by(n))await put('expense_types',{name:n})}
export async function initDB(){st.DB=await new Promise((ok,ko)=>{const r=indexedDB.open('affitti',4);r.onupgradeneeded=()=>{TABLES.forEach(t=>{if(!r.result.objectStoreNames.contains(t))r.result.createObjectStore(t,{keyPath:'id',autoIncrement:true})});if(!r.result.objectStoreNames.contains('meta'))r.result.createObjectStore('meta',{keyPath:'k'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)});
 if(!(await all('expense_types')).length)for(const n of['Elettricità','Gas','Acqua','Riscaldamento','Internet','Spese condominiali','Manutenzione ordinaria','Manutenzione straordinaria','Rata mutuo','IMU','Tassa rifiuti','Altro'])await put('expense_types',{name:n},1);
 await migrateTypes();
 navigator.storage?.persist?.();
 await loadApc();try{const le=await lastExp(),lb=le?Date.parse(le):0;if((await all('apartments')).length&&Date.now()-lb>14*864e5)setTimeout(backupUI,800)}catch{}setTimeout(()=>syncNow().catch(()=>{}),1500)}
export const rawPut = (t,o)=>P(st.DB.transaction(t,'readwrite').objectStore(t).put(o));
export const rawDel = (t,id)=>P(st.DB.transaction(t,'readwrite').objectStore(t).delete(id));
export const docBlob = d=>d.data?new Blob([d.data],{type:d.mime}):d.blob;
