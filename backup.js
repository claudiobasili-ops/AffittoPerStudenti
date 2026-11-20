// Backup: esportazione, ripristino e impronta dei dati
import { doExport, schedSync } from './cloud-sync.js';
import { P, all, docBlob, gm, put, sm } from './db.js';
import { TABLES } from './schema.js';
import { st } from './state.js';
import { loadApc } from './ui.js';
import { $ } from './util.js';
import { dash } from './views-dashboard.js';

export async function fingerprint(){const ser=v=>v&&typeof v=='object'?(v instanceof Blob?'B'+v.size+v.type:v instanceof ArrayBuffer?'A'+v.byteLength:Array.isArray(v)?'['+v.map(ser).join(',')+']':'{'+Object.keys(v).filter(k=>!['gid','rv','dt','uid'].includes(k)).sort().map(k=>JSON.stringify(k)+':'+ser(v[k])).join(',')+'}'):JSON.stringify(v===undefined?null:v);
 let h1=0xdeadbeef,h2=0x41c6ce57;const add=x=>{for(let i=0;i<x.length;i++){const c=x.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}};
 for(const t of TABLES){const rows=(await all(t)).sort((a,b)=>a.id-b.id);add(t+'#'+rows.length+'#');for(const r of rows)add(ser(r)+'\n')}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(h2>>>0).toString(16)+(h1>>>0).toString(16)}
export async function needBackup(lm,ref){const bh=await gm('backupHash');if(bh)return bh!==await fingerprint();if(ref)return!!lm&&lm>ref;for(const t of TABLES)if(t!='expense_types'&&(await all(t)).length)return true;return false}
export async function lastExp(){const v=await gm('lastExport');if(v)return v;try{return+localStorage.lastBackup?new Date(+localStorage.lastBackup).toISOString():null}catch{return null}}
const b64 = b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
export async function exportAll(iso){const o={};for(const t of TABLES)o[t]=(await all(t)).map(({rv,dt,...r})=>r);o.documents=await Promise.all(o.documents.map(async d=>({id:d.id,gid:d.gid||d.uid,uid:d.uid||d.gid,expense_id:d.expense_id,filename:d.filename,mime:d.mime,blob:await b64(docBlob(d))})));o._meta={exportedAt:iso,lastModified:(await gm('lastModified'))||null};return new Blob([JSON.stringify(o)],{type:'application/json'})}
async function importAll(txt){const o=JSON.parse(txt);if(!o.apartments||!o.contracts||!TABLES.every(t=>Array.isArray(o[t]||[])))throw 0;
 for(const t of TABLES){await P(st.DB.transaction(t,'readwrite').objectStore(t).clear());for(const r of o[t]||[]){if(t=='documents'){const bl=await(await fetch(r.blob)).blob();r.data=await bl.arrayBuffer();r.mime=r.mime||bl.type;delete r.blob}delete r.rv;r.dt=Date.now();await put(t,r,1)}}
 await sm('forceMode','local');await sm('tomb',[]);
 const m=o._meta||{},now=new Date().toISOString();await sm('lastModified',m.lastModified||now);await sm('lastRestore',now);await sm('restoredFrom',m.exportedAt||null);await sm('backupHash',await fingerprint());await loadApc();schedSync(1500)}
export function backupUI(){const d=$('#dlg');d.innerHTML=`<h3>Backup dei dati</h3><p>I dati sono salvati su questo dispositivo (e online, se hai attivato il menù Impostazioni). Esporta ogni tanto un backup e conservalo in File/iCloud.</p><button id=ex>Esporta backup</button><label>Ripristina da file<input type=file id=im accept=".json"></label><button onclick="$('#dlg').close()">Chiudi</button>`;d.showModal();
 $('#ex').onclick=doExport;
 $('#im').onchange=async e=>{const f=e.target.files[0];if(f&&confirm('Il ripristino SOSTITUISCE tutti i dati attuali. Continuare?'))try{await importAll(await f.text());alert('Ripristino completato');d.close();dash()}catch{alert('File di backup non valido')}}}
