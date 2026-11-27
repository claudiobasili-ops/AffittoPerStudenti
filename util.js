// Funzioni di base: selettore, formati di date e importi, somme
export const $ = s=>document.querySelector(s);
export const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const eur = v=>Number(v).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
export const thisM = ()=>new Date().toISOString().slice(0,7);
export const APP_VERSION = '2.3.17';
export const sum0 = a=>a.reduce((s,x)=>s+x,0);
export const sumk = (a,k)=>a.reduce((s,x)=>s+x[k],0);
export const today = ()=>new Date().toISOString().slice(0,10);
const pad = n=>String(n).padStart(2,'0');
export const stamp = d=>pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+d.getFullYear()+'_'+pad(d.getHours())+'-'+pad(d.getMinutes());
export const fdt = i=>{if(!i)return'';const d=new Date(i);return isNaN(d)?'':pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
export const FPER = {f:'',t:''};
export const FAP = {expenses:'',dues:'',shares:'',deposits:'',rooms:'',contracts:'',finance:''};
export const FEXP = {who:'',type:'',act:false};
export const fd = d=>d?String(d).slice(0,10).split('-').reverse().join('-'):'';
export const fm = m=>m?String(m).slice(0,7).split('-').reverse().join('-'):'';
export const addD = (d,n)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
export const N = v=>Number(String(v??'').replace(',','.'))||0;
