// Motore locale che simula le API (instradamento delle richieste)
import { newUid } from './cloud-supabase.js';
import { P, all, get, gm, put, sm, touch } from './db.js';
import { check, depositRows, duesRows, involved, mqWeights, norm, sharesRows, split } from './rules.js';
import { CAS, COLS, FK } from './schema.js';
import { st } from './state.js';
import { loadApc } from './ui.js';
import { sum0, sumk, thisM, today } from './util.js';

export async function rm(t,id){if(t=='deposit_moves'){const m=await get(t,id);if(m&&m.kind=='versamento'){const dr=(await depositRows()).find(d=>d.id===m.contract_id);if(dr&&dr.held-m.amount<-.005)throw'Impossibile eliminare: la caparra è già stata restituita o trasferita (elimina prima la restituzione/il trasferimento)'}
  if(m&&m.kind=='trasferimento'){const dr=(await depositRows()).find(d=>d.id===m.to_contract_id);if(dr&&dr.held-m.amount<-.005)throw'Impossibile eliminare: la caparra trasferita è già stata restituita o trasferita sul nuovo contratto (elimina prima quel movimento)'}}
 if(t=='contracts'&&(await all('deposit_moves')).some(m=>m.contract_id===id||m.to_contract_id===id))throw'Il contratto ha movimenti di caparra registrati: eliminali prima (menu Caparre)';if(t=='allocations'){const ss=(await all('allocation_shares')).filter(s=>s.allocation_id===id).map(s=>s.id);if((await all('share_payments')).some(p=>ss.includes(p.share_id)))throw'Ci sono incassi registrati su questa ripartizione: eliminali prima (pulsante Incassi nel menù Spese)'}if(t=='contracts'){const ds=(await all('rent_dues')).filter(d=>d.contract_id===id).map(d=>d.id);if((await all('payments')).some(p=>ds.includes(p.due_id)))throw'Il contratto ha pagamenti registrati: per conservare lo storico imposta la data di uscita invece di eliminarlo'}for(const[c,k]of FK[t]||[])if((await all(c)).some(x=>x[k]===id))throw'Impossibile eliminare: ci sono dati collegati (storico da conservare)';
 for(const[c,k]of CAS[t]||[])for(const x of await all(c))if(x[k]===id)await rm(c,x.id);const old=await get(t,id);if(old&&old.gid&&old.rv!=null)await sm('tomb',[...((await gm('tomb'))||[]),{t,gid:old.gid,dt:Date.now()}]);await P(st.DB.transaction(t,'readwrite').objectStore(t).delete(id));await touch();if(t=='apartments')await loadApc()}
async function route(p,o){const m=o.method||'GET',b=o.body,[path,qs]=p.split('?'),a=path.split('/'),Q=new URLSearchParams(qs||'');
 if(COLS[a[0]]&&a.length<3){const t=a[0];if(m=='GET')return(await all(t)).sort((x,y)=>y.id-x.id);
  if(m=='DELETE'){await rm(t,+a[1]);return{ok:1}}const x=norm(t,b);if(a[1])x.id=+a[1];await check(t,x);
  if(t=='expenses'&&x.id){const old=await get('expenses',x.id),al=(await all('allocations')).find(q=>q.expense_id===x.id);
   if(old&&al&&(old.amount!==x.amount||old.apartment_id!==x.apartment_id||old.period_from!==x.period_from||old.period_to!==x.period_to)){await rm('allocations',al.id);setTimeout(()=>alert('Spesa modificata: la ripartizione precedente è stata annullata. Rifalla con "Ripartisci".'),300)}}
  return put(t,x)}
 if(a[0]=='rent_dues'&&m=='DELETE'){await rm('rent_dues',+a[1]);return{ok:1}}
 if(path=='dues')return duesRows(Q.get('month'));
 if(path=='dues/generate'){const mo=b.month+'-01',last=new Date(Date.UTC(+b.month.slice(0,4),+b.month.slice(5),0)).toISOString().slice(0,10),D=await all('rent_dues');let n=0;
  for(const c of await all('contracts'))if(c.start_date<=last&&(!c.end_date||c.end_date>=mo)&&!D.some(d=>d.contract_id===c.id&&d.month===mo)){await put('rent_dues',{contract_id:c.id,month:mo,amount:c.monthly_rent});n++}return{created:n}}
 if(path=='shares_due')return sharesRows();
 if(path=='deposits')return depositRows();
 if(path=='dashboard'){const mo=Q.get('month'),R=await duesRows(mo),Ex=await all('expenses'),Ap=await all('apartments'),t0=today(),SR=await sharesRows(),AD=await duesRows(),cm=thisM(),r2=v=>Math.round(v*100)/100,alIds=new Set((await all('allocations')).map(a=>a.expense_id)),
   open=AD.filter(d=>d.remaining>0),arrears=r2(sumk(open.filter(d=>d.month.slice(0,7)<cm),'remaining')),current=r2(sumk(open.filter(d=>d.month.slice(0,7)===cm),'remaining')),expDue=r2(sumk(SR,'remaining')),SRl=SR.filter(s=>s.remaining>0.004&&s.spent_on<t0),expLate=r2(sumk(SRl,'remaining'));
  return{per:Ap.sort((x,y)=>x.name.localeCompare(y.name)).map(q=>({id:q.id,name:q.name,expected:sumk(R.filter(d=>d.apt===q.id),'amount'),collected:sumk(R.filter(d=>d.apt===q.id),'paid'),expenses:sumk(Ex.filter(e=>e.apartment_id===q.id&&e.spent_on.slice(0,7)===mo),'amount'),
    landlord:r2(Ex.filter(e=>e.apartment_id===q.id&&e.spent_on.slice(0,7)===mo).reduce((a,e)=>a+(+e.landlord_amount||0),0)),expToCollect:r2(sumk(SR.filter(s=>s.apt===q.id&&s.spent_on.slice(0,7)===mo),'remaining')),expCollected:r2(sumk(SR.filter(s=>s.apt===q.id&&s.spent_on.slice(0,7)===mo),'paid'))})),
   expMonthDue:r2(sumk(SR.filter(s=>s.spent_on.slice(0,7)===mo),'remaining')),shareList:SR.filter(s=>s.remaining>0),unallocated:Ex.filter(e=>e.amount>0&&!alIds.has(e.id)).length,
   asOf:{arrears:r2(arrears+expLate),arrearsN:open.filter(d=>d.month.slice(0,7)<cm).length,arrearsSN:SRl.length,current,expDue:r2(expDue-expLate),total:r2(arrears+current+expDue)},
   k:{apartments:Ap.length,tenants:new Set((await all('contracts')).filter(c=>c.start_date<=t0&&(!c.end_date||c.end_date>=t0)).map(c=>c.tenant_id)).size}}}
 if(a[0]=='expenses'){const e=await get('expenses',+a[1]);if(!e)throw'Spesa non trovata';
  if(a[2]=='tenants')return involved(e);
  if(a[2]=='collect')return(await sharesRows()).filter(s=>s.expense_id===e.id);
  if(a[2]=='allocation'){const al=(await all('allocations')).find(x=>x.expense_id===e.id);if(!al)return null;const Te=await all('tenants');
   return{...al,shares:(await all('allocation_shares')).filter(s=>s.allocation_id===al.id).map(s=>{const t=Te.find(x=>x.id===s.tenant_id);return{...s,tenant:t.first_name+' '+t.last_name}})}}
  if(a[2]=='allocate'){const{criterion,values={}}=b,T=await involved(e);if(!T.length)throw'Nessun inquilino con contratto nel periodo di competenza';
   const total=Math.round(e.amount*100),val=T.map(t=>Number(values[t.id]||0));let w;
   if(criterion=='uguale')w=T.map(()=>1);else if(criterion=='giorni')w=T.map(t=>t.days);
   else if(criterion=='percentuale'){if(Math.abs(sum0(val)-100)>.001)throw'Le percentuali devono sommare a 100';w=val}
   else if(criterion=='quota'){if(Math.round(sum0(val)*100)!==total)throw'Le quote devono sommare all\'importo della spesa';w=val}else if(criterion=='mq')w=await mqWeights(e,T);else throw'Criterio non valido';
   const c=split(total,w);for(const x of(await all('allocations')).filter(x=>x.expense_id===e.id))await rm('allocations',x.id);
   const al=await put('allocations',{expense_id:e.id,criterion,total_cents:total});
   for(let i=0;i<T.length;i++)await put('allocation_shares',{allocation_id:al.id,tenant_id:T[i].id,days:T[i].days,weight:w[i],calc_cents:c[i],final_cents:c[i],modified:false});return{id:al.id}}
  if(a[2]=='docs')return(await all('documents')).filter(d=>d.expense_id===e.id).map(d=>({id:d.id,filename:d.filename}));
  if(a[2]=='doc'){const f=b.get('f');if(!f)throw'File mancante';const ex=(f.name.split('.').pop()||'').toLowerCase(),ty=f.type||({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',heic:'image/heic',heif:'image/heif'})[ex]||'';
   if(!/^(application\/pdf|image\/)/.test(ty))throw'Sono ammessi solo PDF e immagini';if(f.size>15e6)throw'File troppo grande (max 15 MB)';
   return put('documents',{uid:newUid(),expense_id:e.id,filename:f.name,mime:ty,data:await f.arrayBuffer()})}}
 if(a[0]=='allocations'&&a[2]=='shares'){const al=await get('allocations',+a[1]),L=b.shares;
  if(L.reduce((s,x)=>s+Math.round(x.final*100),0)!==al.total_cents)throw'Il totale delle quote deve coincidere con la spesa';
  const SP=await all('share_payments');for(const x of L){const pd=sum0(SP.filter(p=>p.share_id===+x.id).map(p=>Math.round(p.amount*100)));if(Math.round(x.final*100)<pd)throw'Una quota è inferiore a quanto già incassato ('+(pd/100).toFixed(2)+' €): elimina prima l\'incasso'}
  for(const x of L){const s=await get('allocation_shares',+x.id);s.final_cents=Math.round(x.final*100);s.modified=s.final_cents!==s.calc_cents;await put('allocation_shares',s)}return{ok:1}}
 throw'Operazione non supportata'}
export async function api(p,o={}){try{return await route(p,o)}catch(e){alert(typeof e==='string'?e:'Errore: '+(e?.message||e));throw 0}}
