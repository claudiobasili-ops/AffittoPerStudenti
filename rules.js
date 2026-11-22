// Regole di business: controlli, ripartizioni, calcolo canoni e caparre
import { all, get } from './db.js';
import { COLS, NUM, REQ } from './schema.js';
import { addD, fd, sum0, sumk, today } from './util.js';

export function norm(t,b){const o={};for(const k of COLS[t].split(',')){let v=b[k];if(v===''||v===undefined)v=null;else if(k.endsWith('_id')||NUM.includes(k))v=Number(String(v).replace(',','.'));o[k]=v}if(b.id)o.id=Number(b.id);return o}
export const FREQ = {settimanale:[7,0],bisettimanale:[14,0],mensile:[0,1],bimensile:[0,2],semestrale:[0,6],annuale:[0,12]};
export function freqAdd(d,f,k){const q=FREQ[f];if(!q||!d)return d;if(q[0])return addD(d,q[0]*k);
 const x=new Date(d+'T00:00:00Z'),y=x.getUTCFullYear(),mo=x.getUTCMonth()+q[1]*k,last=new Date(Date.UTC(y,mo+1,0)).getUTCDate();
 return new Date(Date.UTC(y,mo,Math.min(x.getUTCDate(),last))).toISOString().slice(0,10)}
export function series(o){if(!o.recurring||!FREQ[o.frequency]||!o.period_from||!o.period_to||!o.spent_on)return[o];const out=[];
 for(let k=0;k<400;k++){const pf=freqAdd(o.period_from,o.frequency,k);if(pf>o.period_to)break;
  const nx=addD(freqAdd(o.period_from,o.frequency,k+1),-1);out.push({...o,spent_on:freqAdd(o.spent_on,o.frequency,k),period_from:pf,period_to:nx<o.period_to?nx:o.period_to})}
 return out.length?out:[o]}
export async function check(t,o){if(t=='deposit_moves'){if(!['versamento','restituzione','trasferimento'].includes(o.kind))throw'Tipo di movimento non valido';const dr=(await depositRows()).find(d=>d.id===o.contract_id);
  if(o.kind=='trasferimento'){if(!o.to_contract_id)throw'Scegli il nuovo contratto di destinazione';if(o.to_contract_id===o.contract_id)throw'Il nuovo contratto deve essere diverso da quello attuale';const C=await all('contracts'),a=C.find(c=>c.id===o.contract_id),b=C.find(c=>c.id===o.to_contract_id);if(!a||!b||a.tenant_id!==b.tenant_id)throw'Il nuovo contratto deve appartenere allo stesso inquilino';if(dr&&o.amount>dr.held+.005)throw"L'importo supera la caparra in deposito ("+dr.held.toFixed(2)+" €)"}
  else if(o.to_contract_id)throw'Il contratto di destinazione è ammesso solo per i trasferimenti';
  if(dr&&o.kind=='versamento'&&dr.deposit>0&&o.amount>dr.toPay+.005)throw"L'importo supera la caparra ancora da versare ("+dr.toPay.toFixed(2)+" €)";
  if(dr&&o.kind=='restituzione'&&o.amount>dr.held+.005)throw"L'importo supera la caparra in deposito ("+dr.held.toFixed(2)+" €)"}
 if(t=='contracts'&&o.deposit!=null&&o.deposit<0)throw'La caparra non può essere negativa';
 if(t=='contracts'&&o.cedolare!=null&&(o.cedolare<0||o.cedolare>100))throw'La cedolare secca deve essere una percentuale tra 0 e 100';
 if(t=='share_payments'){const sr=(await sharesRows()).find(s=>s.id===o.share_id);if(sr&&o.amount>sr.remaining+.005)throw"L'importo supera il residuo ("+sr.remaining.toFixed(2)+" €)"}
 if(t=='payments'){const du=(await duesRows()).find(d=>d.id===o.due_id);if(du&&o.amount>du.remaining+.005)throw"L'importo supera il residuo ("+du.remaining.toFixed(2)+" €)"}
 if(t=='contracts'&&o.due_day&&(o.due_day<1||o.due_day>28))throw'Il giorno di scadenza deve essere tra 1 e 28';
 if(t=='tenants'&&o.tax_code){o.tax_code=o.tax_code.toUpperCase().trim();if(!/^[A-Z0-9]{16}$/.test(o.tax_code))throw'Codice fiscale non valido (16 caratteri)'}for(const k of REQ[t]||[])if(o[k]==null||Number.isNaN(o[k]))throw'Compila il campo obbligatorio: '+k;
 if(t=='expenses'){o.amount=o.amount??0;o.landlord_amount=o.landlord_amount??0;if(Number.isNaN(o.amount)||Number.isNaN(o.landlord_amount)||o.amount<0||o.landlord_amount<0)throw'Gli importi non possono essere negativi';if(!(o.amount>0)&&!(o.landlord_amount>0))throw'Indica almeno un importo: per inquilini o per il locatore';
  if(o.period_to<o.period_from)throw'La competenza «al» precede la competenza «dal»';
  if(o.recurring){if(!FREQ[o.frequency])throw'Scegli la frequenza della spesa ricorrente';if(series(o).length>120)throw'Troppe ripetizioni (oltre 120): riduci il periodo di competenza o cambia frequenza'}
  else o.frequency=null}
 if((t=='payments'||t=='share_payments'||t=='deposit_moves')&&o.amount<=0)throw'L\'importo deve essere maggiore di zero';
 if(t=='contracts'){if(o.end_date&&o.end_date<o.start_date)throw'La data di uscita precede quella di ingresso';
  if(o.room_id){const rm=await get('rooms',o.room_id),cap=Math.max(1,rm?.beds||1),oth=(await all('contracts')).filter(c=>c.id!==o.id&&c.room_id===o.room_id&&o.start_date<=(c.end_date||'9999')&&c.start_date<=(o.end_date||'9999')),
   pts=[o.start_date,...oth.map(c=>c.start_date).filter(d=>d>o.start_date&&d<=(o.end_date||'9999'))],mx=Math.max(...pts.map(p=>1+oth.filter(c=>c.start_date<=p&&(c.end_date||'9999')>=p).length));
   if(mx>cap)throw cap>1?`La camera ha ${cap} posti letto: in quel periodo ci sarebbero ${mx} persone`:'La camera è già assegnata in quel periodo'}}
 if(t=='rooms'){if(Number.isNaN(o.sqm))throw'Metri quadri non validi';if(o.sqm!=null&&o.sqm<=0)throw'I metri quadri devono essere maggiori di zero';
  const ap=o.apartment_id?await get('apartments',o.apartment_id):null,old=o.id?await get('rooms',o.id):null;
  if(ap){const oth=(await all('rooms')).filter(r=>r.apartment_id===ap.id&&r.id!==o.id),moved=!old||old.apartment_id!==ap.id;
   if(moved&&ap.rooms!=null&&oth.length+1>ap.rooms)throw`L’appartamento “${ap.name}” ha ${ap.rooms} camere: ne risultano già censite ${oth.length}`;
   const bt=sum0(oth.map(r=>r.beds||0))+(o.beds||0);if((moved||(old.beds||0)!==(o.beds||0))&&ap.beds!=null&&bt>ap.beds)throw`I posti letto delle camere (${bt}) supererebbero quelli dell’appartamento “${ap.name}” (${ap.beds})`}}
 if(t=='apartments'){for(const k of['purchase_price','purchase_costs','renovation','mortgage_payment','mortgage_interest','mortgage_principal','own_capital'])if(Number.isNaN(o[k])||o[k]<0)throw'Gli importi di investimento e mutuo non possono essere negativi';
  o.prospect=o.prospect?1:0;if(Number.isNaN(o.income_monthly)||o.income_monthly<0)throw'La rendita netta mensile non può essere negativa';
  if(o.income_months!=null&&(Number.isNaN(o.income_months)||!Number.isInteger(o.income_months)||o.income_months<1||o.income_months>12))throw'Il numero di mesi della rendita deve essere un numero intero da 1 a 12';
  const r2=v=>Math.round(v*100)/100,mp=o.mortgage_payment,mi=o.mortgage_interest,mc=o.mortgage_principal;
  if(mp==null&&mi!=null&&mc!=null)o.mortgage_payment=r2(mi+mc);
  else if(mp!=null&&mi!=null&&mc==null){if(mi>mp+.005)throw'La quota interessi supera la rata del mutuo';o.mortgage_principal=r2(mp-mi)}
  else if(mp!=null&&mi==null&&mc!=null){if(mc>mp+.005)throw'La quota capitale supera la rata del mutuo';o.mortgage_interest=r2(mp-mc)}
  else if(mp!=null&&mi!=null&&mc!=null&&Math.abs(mi+mc-mp)>.005)throw`Quota interessi (${mi.toFixed(2)} €) + quota capitale (${mc.toFixed(2)} €) devono essere uguali alla rata (${mp.toFixed(2)} €)`}
 if(t=='expenses'&&o.period_to<o.period_from)throw'Periodo di competenza non valido'}
export function split(total,w){const S=sum0(w);if(!S)throw'I valori inseriti non possono essere tutti zero';const raw=w.map(x=>total*x/S),fl=raw.map(Math.floor),rem=total-sum0(fl);
 raw.map((x,i)=>[x-fl[i],i]).sort((a,b)=>b[0]-a[0]).slice(0,rem).forEach(([,i])=>fl[i]++);return fl}
export async function involved(e){const m=new Map();
 for(const c of(await all('contracts')).filter(c=>c.apartment_id===e.apartment_id&&c.start_date<=e.period_to&&(!c.end_date||c.end_date>=e.period_from))){
  const f=c.start_date>e.period_from?c.start_date:e.period_from,t=c.end_date&&c.end_date<e.period_to?c.end_date:e.period_to;
  m.set(c.tenant_id,(m.get(c.tenant_id)||0)+Math.round((new Date(t)-new Date(f))/864e5)+1)}
 const Te=await all('tenants');return[...m].map(([id,days])=>{const t=Te.find(x=>x.id===id);return{id,name:t.first_name+' '+t.last_name,days}})}
export async function mqWeights(e,T){const[C,Ro,Te]=await Promise.all(['contracts','rooms','tenants'].map(all)),Cs=C.filter(c=>c.apartment_id===e.apartment_id&&c.start_date<=e.period_to&&(!c.end_date||c.end_date>=e.period_from)),
 miss=[...new Set(Cs.filter(c=>{const r=Ro.find(x=>x.id===c.room_id);return!(r&&r.sqm>0)}).map(c=>c.tenant_id))];
 if(miss.length)throw'Per ripartire per mq serve la camera con i metri quadri nel contratto di: '+miss.map(id=>{const t=Te.find(x=>x.id===id);return t.first_name+' '+t.last_name}).join(', ');
 const w=new Map(T.map(t=>[t.id,0]));
 for(let d=e.period_from;d<=e.period_to;d=addD(d,1)){const rm=new Map();
  for(const c of Cs)if(c.start_date<=d&&(!c.end_date||c.end_date>=d)){if(!rm.has(c.room_id))rm.set(c.room_id,new Set());rm.get(c.room_id).add(c.tenant_id)}
  for(const[rid,ts]of rm){const q=Ro.find(x=>x.id===rid).sqm/ts.size;for(const tid of ts)w.set(tid,(w.get(tid)||0)+q)}}
 return T.map(t=>Math.round((w.get(t.id)||0)*1e6)/1e6)}
export async function duesRows(month){const[D,C,Te,Ap,Pa]=await Promise.all(['rent_dues','contracts','tenants','apartments','payments'].map(all));
 return D.filter(d=>!month||d.month.slice(0,7)===month).map(d=>{const c=C.find(x=>x.id===d.contract_id),t=Te.find(x=>x.id===c.tenant_id),paid=sumk(Pa.filter(p=>p.due_id===d.id),'amount'),rem=Math.round((d.amount-paid)*100)/100;
  return{id:d.id,month:d.month,amount:d.amount,tenant:t.first_name+' '+t.last_name,apartment:Ap.find(x=>x.id===c.apartment_id).name,apt:c.apartment_id,paid,remaining:rem,late:rem>0&&d.month.slice(0,8)+String(c.due_day||5).padStart(2,'0')<today()}})
 .sort((a,b)=>b.month.localeCompare(a.month)||a.apartment.localeCompare(b.apartment))}
export async function sharesRows(){const[Al,Sh,SP,E,Te,Ap,Ty]=await Promise.all(['allocations','allocation_shares','share_payments','expenses','tenants','apartments','expense_types'].map(all));
 return Sh.map(s=>{const al=Al.find(a=>a.id===s.allocation_id),e=al&&E.find(x=>x.id===al.expense_id);if(!e)return null;const t=Te.find(x=>x.id===s.tenant_id),pays=SP.filter(p=>p.share_id===s.id).sort((x,y)=>y.paid_on.localeCompare(x.paid_on)||y.id-x.id),pc=sum0(pays.map(p=>Math.round(p.amount*100)));
  return{id:s.id,expense_id:e.id,desc:e.description||Ty.find(x=>x.id===e.type_id)?.name||'Spesa',spent_on:e.spent_on,apt:e.apartment_id,apartment:Ap.find(x=>x.id===e.apartment_id)?.name||'',tenant_id:s.tenant_id,tenant:t.first_name+' '+t.last_name,
   final:s.final_cents/100,paid:pc/100,remaining:(s.final_cents-pc)/100,payments:pays}}).filter(Boolean).sort((a,b)=>b.spent_on.localeCompare(a.spent_on)||a.tenant.localeCompare(b.tenant))}
export async function depositRows(){const[C,Te,Ap,M]=await Promise.all(['contracts','tenants','apartments','deposit_moves'].map(all)),rk={'Da restituire':0,'Da versare':1,'Versata in parte':1,'Versata':2,'Da trasferimento':2,'Restituita in parte':2,'Trasferita in parte':2,'Restituita':3,'Trasferita':3};
 return C.map(c=>{const own=M.filter(m=>m.contract_id===c.id),inc=M.filter(m=>m.to_contract_id===c.id&&m.kind==='trasferimento').map(m=>({...m,incoming:true,from_contract_id:m.contract_id})),mv=[...own,...inc].sort((a,b)=>b.moved_on.localeCompare(a.moved_on)||b.id-a.id);if(!(c.deposit>0)&&!mv.length)return null;
  const cs=k=>sum0(own.filter(m=>m.kind===k).map(m=>Math.round(m.amount*100)))/100,paid=cs('versamento'),ret=cs('restituzione'),trf=cs('trasferimento'),tin=sum0(inc.map(m=>Math.round(m.amount*100)))/100,held=Math.round((paid+tin-ret-trf)*100)/100,dep=c.deposit||0,toPay=Math.max(0,Math.round((dep-paid-tin)*100)/100),ended=!!c.end_date&&c.end_date<today(),t=Te.find(x=>x.id===c.tenant_id);
  const out=ret+trf,status=out>0&&held<=.004?(trf>0&&ret<=0?'Trasferita':'Restituita'):held>.004&&ended?'Da restituire':out>0?(ret<=0?'Trasferita in parte':'Restituita in parte'):tin>0&&paid<=0&&toPay<=.004?'Da trasferimento':paid+tin<=0?'Da versare':toPay>.004?'Versata in parte':'Versata';
  return{id:c.id,tenant_id:c.tenant_id,tenant:t.first_name+' '+t.last_name,apartment:Ap.find(x=>x.id===c.apartment_id)?.name||'',apt:c.apartment_id,start:c.start_date,end:c.end_date,deposit:dep,paid,returned:ret,transferred:trf,incoming:tin,held,toPay,status,moves:mv}})
  .filter(Boolean).sort((a,b)=>rk[a.status]-rk[b.status]||a.tenant.localeCompare(b.tenant))}
export async function roomInfo(m){const[Ro,C,Te]=await Promise.all(['rooms','contracts','tenants'].map(all)),ms=m+'-01',me=new Date(Date.UTC(+m.slice(0,4),+m.slice(5),0)).toISOString().slice(0,10),o={};
 for(const r of Ro){const cs=C.filter(c=>c.room_id===r.id),ov=cs.filter(c=>c.start_date<=me&&(!c.end_date||c.end_date>=ms)),full=ov.some(c=>c.start_date<=ms&&(!c.end_date||c.end_date>=me));
  if(ov.length)o[r.id]={st:full?'Occupata':'Parzialmente occupata',per:ov.map(c=>{const t=Te.find(x=>x.id===c.tenant_id);return t.first_name+' '+t.last_name+': da '+fd(c.start_date)+' a '+(c.end_date?fd(c.end_date):'in corso')}).join(' · ')};
  else{const pv=cs.filter(c=>c.end_date&&c.end_date<ms).map(c=>c.end_date).sort().pop(),nx=cs.filter(c=>c.start_date>me).map(c=>c.start_date).sort()[0];
   o[r.id]={st:'Libera',per:'da '+(pv?fd(addD(pv,1)):'—')+' a '+(nx?fd(addD(nx,-1)):'aperto')}}}return o}
