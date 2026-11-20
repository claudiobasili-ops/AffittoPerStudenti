// Sincronizzazione per record con il cloud
import { exportAll, fingerprint } from './backup.js';
import { authToken, ce, getSession, httpErr, newUid, sb } from './cloud-supabase.js';
import { P, all, docBlob, get, gm, rawDel, rawPut, sm } from './db.js';
import { V } from './menu.js';
import { TABLES } from './schema.js';
import { SYNC, st } from './state.js';
import { fileDlg, loadApc } from './ui.js';
import { $, esc, fdt, stamp } from './util.js';
import { cloudView } from './views-settings.js';

const ORDER = ['apartments','expense_types','tenants','rooms','contracts','rent_dues','payments','expenses','allocations','allocation_shares','share_payments','deposit_moves','documents'];
const SCH = {apartments:{name:'t',color:'t',address:'t',city:'t',rooms:'n',beds:'n',description:'t',notes:'t'},expense_types:{name:'t'},
  tenants:{first_name:'t',last_name:'t',tax_code:'t',phone:'t',email:'t',notes:'t'},rooms:{apartment_id:'>apartments',name:'t',beds:'n',sqm:'n'},
  contracts:{tenant_id:'>tenants',apartment_id:'>apartments',room_id:'>rooms',start_date:'t',end_date:'t',monthly_rent:'n',deposit:'n',due_day:'n',notes:'t'},
  rent_dues:{contract_id:'>contracts',month:'t',amount:'n'},payments:{due_id:'>rent_dues',paid_on:'t',amount:'n',method:'t',notes:'t'},
  expenses:{apartment_id:'>apartments',type_id:'>expense_types',description:'t',amount:'n',landlord_amount:'n',spent_on:'t',period_from:'t',period_to:'t',supplier:'t',notes:'t'},
  allocations:{expense_id:'>expenses',criterion:'t',total_cents:'n'},allocation_shares:{allocation_id:'>allocations',tenant_id:'>tenants',days:'n',weight:'n',calc_cents:'n',final_cents:'n',modified:'b'},
  share_payments:{share_id:'>allocation_shares',paid_on:'t',amount:'n',method:'t',notes:'t'},deposit_moves:{contract_id:'>contracts',kind:'t',moved_on:'t',amount:'n',method:'t',notes:'t'},
  documents:{expense_id:'>expenses',filename:'t',mime:'t',size:'n'}};
const hasData = async()=>{for(const t of TABLES)if(t!='expense_types'&&(await all(t)).length)return true;return false};
async function pendingCount(){let n=((await gm('tomb'))||[]).length;for(const t of ORDER)n+=(await all(t)).filter(r=>r.dt>0||!r.gid).length;return n}
async function ensureGids(){for(const t of ORDER)for(const r of await all(t))if(!r.gid){const o={...r,gid:t=='documents'?(r.uid||newUid()):newUid(),dt:Date.now()};if(t=='documents')o.uid=o.gid;await rawPut(t,o)}}
async function loadLocal(){const L={},G={},H={};for(const t of ORDER){L[t]=await all(t);G[t]=new Map(L[t].map(r=>[r.id,r.gid]));H[t]=new Map(L[t].map(r=>[r.gid,r.id]))}return{L,G,H}}
function mapOut(t,r,G){const o={gid:r.gid,deleted_at:null};for(const[k,ty]of Object.entries(SCH[t])){let v=r[k];
  if(ty[0]=='>'){const g=v==null?null:G[ty.slice(1)].get(v);if(v!=null&&!g)throw ce('data','Riferimento mancante in '+t+'.'+k);v=g}else if(ty=='b')v=!!v;else if(v===''||v===undefined)v=null;o[k]=v}
 if(t=='documents')o.size=r.data?r.data.byteLength:(r.blob?r.blob.size:null);return o}
async function uploadDoc(s,d){const up=new Set((await gm('syncUploaded'))||[]);if(up.has(d.gid))return;
 const r=await sb(`/storage/v1/object/allegati/${s.uid}/${d.gid}`,{method:'POST',headers:{'x-upsert':'true','Content-Type':d.mime||'application/octet-stream'},body:docBlob(d)},s.at);if(!r.ok)throw ce('http','Allegato non caricato: '+d.filename);
 up.add(d.gid);await sm('syncUploaded',[...up])}
async function downloadDoc(s,gid,name){const r=await sb(`/storage/v1/object/authenticated/allegati/${s.uid}/${gid}`,{},s.at);if(!r.ok)throw ce('http','Allegato non scaricabile: '+name);
 const up=new Set((await gm('syncUploaded'))||[]);up.add(gid);await sm('syncUploaded',[...up]);return r.arrayBuffer()}
async function pullAll(s,from){const R={};let max=0;for(const t of ORDER){R[t]=[];for(let off=0;;off+=1000){const r=await sb(`/rest/v1/${t}?select=*&rev=gt.${from}&order=rev.asc&limit=1000&offset=${off}`,{headers:{Accept:'application/json'}},s.at);
  if(!r.ok)throw await httpErr(r);const a=await r.json();R[t].push(...a);for(const x of a)max=Math.max(max,x.rev);if(a.length<1000)break}}return{R,max}}
async function applyPull(s,R,st){const{L,G,H}=await loadLocal();let tomb=(await gm('tomb'))||[],tchg=0;
 for(const t of ORDER){if(!R[t].length)continue;const by=new Map(L[t].map(r=>[r.gid,r]));
  for(const r of R[t]){let loc=by.get(r.gid);if(!loc&&t=='expense_types'&&!r.deleted_at)loc=L[t].find(x=>x.rv==null&&x.name===r.name);
   if(loc&&loc.gid===r.gid&&loc.rv===r.rev)continue;const ru=Date.parse(r.updated_at)||0,tb=tomb.find(x=>x.gid===r.gid);
   if(r.deleted_at){if(tb){tomb=tomb.filter(x=>x!==tb);tchg=1}
    if(loc){if(loc.dt>0&&loc.dt>ru){loc.rv=r.rev;await rawPut(t,loc);st.conf++}else{await rawDel(t,loc.id);H[t].delete(loc.gid);G[t].delete(loc.id);st.del++}}continue}
   if(tb){if(ru>tb.dt){tomb=tomb.filter(x=>x!==tb);tchg=1}else continue}
   const adopt=loc&&loc.gid!==r.gid;if(loc&&loc.dt>0&&!adopt){if(loc.dt>=ru){loc.rv=r.rev;await rawPut(t,loc);st.conf++;continue}st.conf++}
   const f={};for(const[k,ty]of Object.entries(SCH[t])){let v=r[k];if(ty[0]=='>')v=v==null?null:(H[ty.slice(1)].get(v)??null);f[k]=v}
   const rec=loc?{...loc,...f}:{...f};rec.gid=r.gid;rec.rv=r.rev;delete rec.dt;
   if(t=='documents'){rec.uid=r.gid;if(!rec.data&&!rec.blob)rec.data=await downloadDoc(s,r.gid,r.filename)}
   const id=await rawPut(t,rec);H[t].set(r.gid,id);G[t].set(id,r.gid);st.recv++}}
 await sm('tomb',tomb);if(st.recv||st.del||st.conf)await loadApc()}
async function pushAll(s,st,all_){await ensureGids();const{L,G}=await loadLocal();
 for(const t of ORDER){const dirty=L[t].filter(r=>all_||r.dt>0);if(!dirty.length)continue;if(t=='documents')for(const d of dirty)await uploadDoc(s,d);
  for(let i=0;i<dirty.length;i+=100){const ch=dirty.slice(i,i+100),body=ch.map(r=>mapOut(t,r,G));
   const r=await sb(`/rest/v1/${t}?on_conflict=gid`,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)},s.at);
   if(!r.ok)throw await httpErr(r);const rv=new Map((await r.json()).map(x=>[x.gid,x.rev]));
   for(const loc of ch){const cur=await get(t,loc.id);if(!cur)continue;cur.rv=rv.get(loc.gid);if(cur.dt===loc.dt)delete cur.dt;await rawPut(t,cur)}st.sent+=ch.length}}
 const tomb=(await gm('tomb'))||[],done=new Set();
 for(const t of[...ORDER].reverse()){const g=tomb.filter(x=>x.t==t).map(x=>x.gid);for(let i=0;i<g.length;i+=100){const ch=g.slice(i,i+100);
  const r=await sb(`/rest/v1/${t}?gid=in.(${ch.join(',')})`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({deleted_at:new Date().toISOString()})},s.at);
  if(!r.ok)throw await httpErr(r);ch.forEach(x=>done.add(x));st.del2+=ch.length}}
 if(done.size)await sm('tomb',((await gm('tomb'))||[]).filter(x=>!done.has(x.gid)))}
function askFirst(info){return new Promise(res=>{const d=$('#dlg');d.onclick=null;d.onclose=null;
 d.innerHTML=`<div class=fb><h3>Primo collegamento al cloud</h3><p>Il cloud contiene già dati (${info.n} record${info.dev?', ultimo aggiornamento da '+esc(info.dev):''}${info.at?', '+fdt(info.at):''}) e questo dispositivo ha dati propri, mai sincronizzati. Non posso unirli in modo sicuro: quale versione vuoi tenere?</p><p class=mut>L’altra versione verrà sostituita. Se non sei sicuro, esporta prima un backup di questo dispositivo.</p></div><div class=ft><button type=button id=cf1>Tieni questo dispositivo</button> <button type=button id=cf2>Usa i dati del cloud</button> <button type=button class=sec id=cf3>Esporta backup</button> <button type=button class=sec id=cf4>Decidi dopo</button></div>`;
 let done=0;const fin=v=>{if(done)return;done=1;d.onclose=null;if(d.open)d.close();res(v)};
 $('#cf1').onclick=()=>fin('local');$('#cf2').onclick=()=>fin('cloud');$('#cf4').onclick=()=>fin('later');$('#cf3').onclick=()=>{done=1;res('later');doExport()};
 d.onclose=()=>fin('later');d.showModal()})}
export async function syncNow(manual){if(SYNC.busy){SYNC.again=1;return}if(!(await getSession())){SYNC.state='off';return}if(!navigator.onLine){SYNC.state='offline';return}
 SYNC.busy=1;SYNC.state='syncing';SYNC.msg='';const st={recv:0,sent:0,del:0,del2:0,conf:0};
 try{const s=await authToken();let last=+(await gm('syncRev'))||0;
  if((await gm('syncUid'))!==s.uid){last=0;await sm('syncRev',0);await sm('syncUid',s.uid);for(const t of ORDER)for(const r of await all(t)){delete r.rv;if(r.gid)r.dt=Date.now();await rawPut(t,r)}}
  await ensureGids();let force=await gm('forceMode');
  const{R,max}=await pullAll(s,force?0:Math.max(0,last-50)),live=ORDER.reduce((n,t)=>n+R[t].filter(x=>!x.deleted_at).length,0);let ok=1;
  if(!force&&(await gm('syncInit'))!==s.uid&&live>0&&await hasData()){const all_=ORDER.flatMap(t=>R[t]).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
   if(manual||(!SYNC.asked&&!$('#dlg').open)){SYNC.asked=1;const c=await askFirst({n:live,at:all_[0]?.updated_at});if(c=='local'||c=='cloud'){force=c;SYNC.asked=0}else ok=0}else ok=0;if(!ok)SYNC.state='conflict'}
  if(ok){
   if(force=='cloud'){for(const t of TABLES)await P(st.DB.transaction(t,'readwrite').objectStore(t).clear());await sm('tomb',[]);await applyPull(s,R,st)}
   else if(force=='local'){await pushAll(s,st,true);const{L}=await loadLocal(),have=new Set(ORDER.flatMap(t=>L[t].map(r=>r.gid)));
    for(const t of[...ORDER].reverse()){const g=R[t].filter(x=>!x.deleted_at&&!have.has(x.gid)).map(x=>x.gid);for(let i=0;i<g.length;i+=100){const ch=g.slice(i,i+100);
     const r=await sb(`/rest/v1/${t}?gid=in.(${ch.join(',')})`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({deleted_at:new Date().toISOString()})},s.at);if(!r.ok)throw await httpErr(r);st.del2+=ch.length}}
    await sm('tomb',[])}
   else{await applyPull(s,R,st);await pushAll(s,st,false)}
   await sm('syncRev',Math.max(last,max));await sm('syncInit',s.uid);await sm('forceMode',null);await sm('syncAt',new Date().toISOString());SYNC.state='ok';SYNC.asked=0;SYNC.pulled=st.recv+st.del+st.conf>0?1:0;
   SYNC.info=`ricevuti ${st.recv}, inviati ${st.sent}, eliminati ${st.del+st.del2}${st.conf?', conflitti risolti '+st.conf+' (vince la modifica più recente)':''}`}
 }catch(e){SYNC.state=e.kind=='login'?'login':e.kind=='net'?'offline':'error';SYNC.msg=e.message||String(e)}
 finally{SYNC.busy=0;if(SYNC.pulled){SYNC.pulled=0;if(!$('#dlg').open)try{V[st.CURK][1]()}catch{}}
  try{const el=$('#cloudline');if(el)el.textContent=await cloudLine();if(st.CURK=='cloud'&&!$('#dlg').open)cloudView()}catch{}
  if(SYNC.again){SYNC.again=0;schedSync(800)}}}
export function schedSync(ms=4000){clearTimeout(SYNC.timer);SYNC.timer=setTimeout(()=>syncNow().catch(()=>{}),ms)}
addEventListener('online',()=>schedSync(500));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedSync(500)});
export async function cloudLine(){const s=await getSession();if(!s)return'non attivo (accedi dal menù Impostazioni)';const at=await gm('syncAt'),pend=await pendingCount();
 if(SYNC.state=='conflict')return'⚠ da decidere: dati diversi su questo dispositivo e nel cloud (menù Impostazioni)';if(SYNC.state=='login')return'sessione scaduta: accedi di nuovo (menù Impostazioni)';
 if(SYNC.state=='syncing')return'sincronizzazione in corso…';const last=at?'ultimo controllo '+fdt(at):'mai sincronizzato';
 if(SYNC.state=='offline'&&SYNC.msg&&SYNC.msg!='Nessuna connessione')return'cloud non raggiungibile ('+last+')';if(SYNC.state=='error')return'errore: '+SYNC.msg+' · '+last;
 if(pend)return(navigator.onLine&&SYNC.state!='offline'?'modifiche in attesa di invio':'offline · modifiche in attesa di invio')+' ('+pend+', '+last+')';return at?'✓ aggiornato · '+last:'in attesa della prima sincronizzazione'}
export async function doExport(){const n=new Date(),bl=await exportAll(n.toISOString());await sm('lastExport',n.toISOString());await sm('backupHash',await fingerprint());fileDlg('backup-affitti-'+stamp(n)+'.json',bl,'Backup pronto')}
