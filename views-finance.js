// Menù Finanza: rendimenti, cash flow, tasso di occupazione e resa per mq
import { all } from './db.js';
import { SORT, st } from './state.js';
import { aptSel, aptTag, sortBar, sortWire, srt, thS } from './ui.js';
import { $, FAP, esc, eur, today } from './util.js';

const MN = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const C_POS = '#2a78d6', C_NEG = '#e34948', C_GROSS = '#2a78d6', C_NET = '#eb6834';
const r2 = v=>Math.round(v*100)/100, n0 = v=>+v||0, pad = n=>String(n).padStart(2,'0');
const days = (a,b)=>a>b?0:Math.round((Date.parse(b)-Date.parse(a))/864e5)+1;
const pct = v=>v==null||!isFinite(v)?'—':v.toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
const div = (a,b)=>b>0?a/b*100:null;
const isMortgage = t=>/^rata\s+mutuo$/i.test((t?.name||'').trim()), isImu = t=>/^imu$/i.test((t?.name||'').trim());
const lastDay = (y,m)=>new Date(Date.UTC(y,m+1,0)).toISOString().slice(0,10);
const blankM = ()=>Array.from({length:12},()=>({coll:0,exp:0,tax:0,mort:0}));

// Calcolo degli indicatori dell'anno Y per ogni appartamento e camera
export async function finData(Y){
 const [Ap,Ro,C,D,Pa,E,Ty] = await Promise.all(['apartments','rooms','contracts','rent_dues','payments','expenses','expense_types'].map(all));
 const t0 = today(), cy = +t0.slice(0,4), ys = Y+'-01-01', ye = Y+'-12-31', pe = Y==cy?t0:ye, pm = pe.slice(0,7), lastI = +pm.slice(5)-1;
 const mortT = new Set(Ty.filter(isMortgage).map(t=>t.id)), imuT = new Set(Ty.filter(isImu).map(t=>t.id)), paid = new Map();
 // Una voce dell'investimento conta se la sua data è nell'anno scelto o prima (senza data: sempre)
 const upTo = d=>!d||+String(d).slice(0,4)<=Y;
 for(const p of Pa)paid.set(p.due_id,(paid.get(p.due_id)||0)+n0(p.amount));
 const A = new Map(Ap.map(a=>{const inv = (upTo(a.purchase_date)?n0(a.purchase_price):0)+(upTo(a.purchase_costs_date)?n0(a.purchase_costs):0)+(upTo(a.renovation_date)?n0(a.renovation):0),
   invOut = [a.purchase_date,a.purchase_costs_date,a.renovation_date].some((d,j)=>d&&!upTo(d)&&n0([a.purchase_price,a.purchase_costs,a.renovation][j])>0);
  return [a.id,{id:a.id,name:a.name,inv,invOut,imu:0,own:n0(a.own_capital),mp:n0(a.mortgage_payment),mi:n0(a.mortgage_interest),rent:0,coll:0,exp:0,tax:0,mort:0,mortEst:false,cap:0,occ:0,sqm:0,m:blankM()}]}));
 const RM = new Map(Ro.map(r=>[r.id,{id:r.id,apt:r.apartment_id,name:r.name,beds:Math.max(1,n0(r.beds)||1),sqm:n0(r.sqm),rent:0,occ:0,cap:0}]));
 // Canoni annui: canoni generati dell'anno + mesi di contratto non ancora generati (al canone del contratto)
 const seen = new Set();
 for(const d of D){if(d.month.slice(0,4)!=Y)continue;const c = C.find(x=>x.id===d.contract_id),a = c&&A.get(c.apartment_id);if(!a)continue;
  const mo = d.month.slice(0,7),i = +mo.slice(5)-1;seen.add(c.id+'|'+mo);a.rent += n0(d.amount);if(c.room_id&&RM.has(c.room_id))RM.get(c.room_id).rent += n0(d.amount);
  if(mo<=pm){const p = paid.get(d.id)||0,tx = p*n0(c.cedolare)/100;a.coll += p;a.tax += tx;a.m[i].coll += p;a.m[i].tax += tx}}
 for(const c of C){const a = A.get(c.apartment_id);if(!a)continue;
  for(let i=0;i<12;i++){const ms = `${Y}-${pad(i+1)}-01`,me = lastDay(Y,i);if(seen.has(c.id+'|'+ms.slice(0,7))||c.start_date>me||(c.end_date&&c.end_date<ms))continue;
   a.rent += n0(c.monthly_rent);if(c.room_id&&RM.has(c.room_id))RM.get(c.room_id).rent += n0(c.monthly_rent)}}
 // Spese del locatore (esclusa la rata del mutuo) e rate del mutuo registrate tra le spese
 const hasMort = new Set();
 for(const e of E){const a = A.get(e.apartment_id);if(!a||!e.spent_on||e.spent_on<ys||e.spent_on>pe)continue;const i = +e.spent_on.slice(5,7)-1;
  if(mortT.has(e.type_id)){const v = n0(e.amount)+n0(e.landlord_amount);a.mort += v;a.m[i].mort += v;hasMort.add(a.id)}
  else if(imuT.has(e.type_id)){const v = n0(e.amount)+n0(e.landlord_amount);a.imu += v;a.tax += v;a.m[i].tax += v}
  else{const v = n0(e.landlord_amount);a.exp += v;a.m[i].exp += v}}
 // Senza rate registrate si usa la rata mensile della scheda appartamento per i mesi trascorsi
 for(const a of A.values())if(!hasMort.has(a.id)&&a.mp>0){a.mortEst = true;for(let i=0;i<=lastI;i++){a.m[i].mort += a.mp;a.mort += a.mp}}
 // Tasso di occupazione per posti letto: giorni occupati ÷ (posti letto × giorni del periodo)
 const nd = days(ys,pe), occOf = c=>days(c.start_date>ys?c.start_date:ys,c.end_date&&c.end_date<pe?c.end_date:pe);
 for(const r of RM.values()){r.cap = r.beds*nd;r.occ = Math.min(r.cap,C.filter(c=>c.room_id===r.id).reduce((s,c)=>s+occOf(c),0))}
 for(const a of A.values()){const rs = [...RM.values()].filter(r=>r.apt===a.id),ap = Ap.find(x=>x.id===a.id),cs = C.filter(c=>c.apartment_id===a.id);
  a.sqm = rs.reduce((s,r)=>s+r.sqm,0);
  if(rs.length){a.cap = rs.reduce((s,r)=>s+r.cap,0);a.occ = Math.min(a.cap,rs.reduce((s,r)=>s+r.occ,0)+cs.filter(c=>!c.room_id||!RM.has(c.room_id)).reduce((s,c)=>s+occOf(c),0))}
  else{a.cap = Math.max(1,n0(ap.beds)||n0(ap.rooms)||1)*nd;a.occ = Math.min(a.cap,cs.reduce((s,c)=>s+occOf(c),0))}}
 const kpi = a=>{a.cf = a.coll-a.exp-a.tax-a.mort;a.gross = div(a.rent,a.inv);a.net = div(a.coll-a.exp-a.tax,a.inv);a.coc = div(a.cf,a.own);a.occP = div(a.occ,a.cap);a.psqm = a.sqm>0?a.rent/a.sqm:null;
  a.mInt = a.mp>0&&a.mi>0?a.mort*a.mi/a.mp:null;a.m.forEach(m=>m.cf = m.coll-m.exp-m.tax-m.mort);return a};
 const L = [...A.values()].map(kpi).sort((x,y)=>x.name.localeCompare(y.name,'it'));
 for(const r of RM.values()){r.occP = div(r.occ,r.cap);r.psqm = r.sqm>0?r.rent/r.sqm:null;r.aname = A.get(r.apt)?.name||''}
 return {Y,pe,partial:Y==cy,future:Y>cy,lastI,A:L,R:[...RM.values()].filter(r=>A.has(r.apt))}}

// Somma degli appartamenti scelti; i rendimenti usano solo quelli con l'investimento indicato
function total(L){const T = {rent:0,coll:0,exp:0,tax:0,imu:0,invOut:L.some(a=>a.invOut),mort:0,cap:0,occ:0,sqm:0,inv:0,own:0,mInt:null,mortEst:L.some(a=>a.mortEst),m:blankM()},I = {rent:0,netN:0,inv:0},O = {cf:0,own:0};
 for(const a of L){for(const k of['rent','coll','exp','tax','imu','mort','cap','occ','sqm','inv','own'])T[k] += a[k];
  a.m.forEach((m,i)=>{for(const k of['coll','exp','tax','mort'])T.m[i][k] += m[k]});
  if(a.mInt!=null)T.mInt = (T.mInt||0)+a.mInt;
  if(a.inv>0){I.rent += a.rent;I.netN += a.coll-a.exp-a.tax;I.inv += a.inv}
  if(a.own>0){O.cf += a.cf;O.own += a.own}}
 T.cf = T.coll-T.exp-T.tax-T.mort;T.gross = div(I.rent,I.inv);T.net = div(I.netN,I.inv);T.coc = div(O.cf,O.own);T.occP = div(T.occ,T.cap);T.psqm = T.sqm>0?T.rent/T.sqm:null;
 T.partInv = L.some(a=>a.inv>0)&&L.some(a=>!(a.inv>0));T.m.forEach(m=>m.cf = m.coll-m.exp-m.tax-m.mort);return T}

const niceStep = v=>{const p = Math.pow(10,Math.floor(Math.log10(v))),f = v/p;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p};
const eurK = v=>Math.abs(v)>=1000?(v/1000).toLocaleString('it-IT',{maximumFractionDigits:1})+'k':String(Math.round(v));
// Barra con l'estremità dei dati arrotondata e la base appoggiata sullo zero
function bar(x,w,y0,y1,c){const h = Math.abs(y1-y0);if(h<.5)return'';const r = Math.min(4,w/2,h),up = y1<y0;
 return up?`<path d="M${x},${y0}V${y1+r}Q${x},${y1} ${x+r},${y1}H${x+w-r}Q${x+w},${y1} ${x+w},${y1+r}V${y0}Z" fill="${c}"/>`
  :`<path d="M${x},${y0}V${y1-r}Q${x},${y1} ${x+r},${y1}H${x+w-r}Q${x+w},${y1} ${x+w},${y1-r}V${y0}Z" fill="${c}"/>`}
function cfChart(M){const W = 720,H = 240,L = 50,Rr = 6,T = 10,B = 26,pw = W-L-Rr,ph = H-T-B,v = M.map(m=>m.cf),hi = Math.max(0,...v),lo = Math.min(0,...v);
 if(Math.abs(hi)<.005&&Math.abs(lo)<.005)return'<p class=mut>Nessun movimento nell’anno selezionato.</p>';
 const st = niceStep((hi-lo)/4||1),top = Math.ceil(hi/st)*st,bot = Math.floor(lo/st)*st,y = x=>T+(top-x)/(top-bot||1)*ph,bw = pw/12,w = Math.min(30,bw*.62);let g = '';
 for(let t=bot;t<=top+st/2;t+=st)g += `<line x1=${L} x2=${W-Rr} y1=${y(t)} y2=${y(t)} stroke="${Math.abs(t)<1e-9?'#6b7280':'#e5e7eb'}" stroke-width=1 /><text x=${L-6} y=${y(t)+4} text-anchor=end font-size=11 fill="#6b7280">${eurK(t)}</text>`;
 const bars = M.map((m,i)=>bar(L+bw*i+(bw-w)/2,w,y(0),y(m.cf),m.cf>=0?C_POS:C_NEG)).join(''),
  lab = M.map((m,i)=>`<text x=${L+bw*i+bw/2} y=${H-8} text-anchor=middle font-size=11 fill="#4b5563">${MN[i]}</text>`).join(''),
  hit = M.map((m,i)=>`<rect class=hit data-i=${i} x=${L+bw*i} y=${T} width=${bw} height=${ph} aria-label="${MN[i]}: ${eur(r2(m.cf))}"></rect>`).join('');
 return`<div class=fch id=cfc><svg viewBox="0 0 ${W} ${H}" role=img aria-label="Cash flow mensile">${g}${bars}${lab}${hit}</svg><div class=ftip hidden></div></div>`}
function yieldChart(L){const rows = L.filter(a=>a.inv>0);if(!rows.length)return'<p class=mut>Inserisci l’investimento nella scheda degli appartamenti per confrontarne i rendimenti.</p>';
 const mx = Math.max(.0001,...rows.flatMap(a=>[a.gross||0,a.net||0]));
 const br = (n,v,c)=>`<div class=br><span class=bl>${n}</span><div class=bt><div style="width:${Math.max(0,v||0)/mx*100}%;background:${c}"></div></div><span class=bv>${pct(v)}</span></div>`;
 return`<div class=lgd><span><i style="background:${C_GROSS}"></i>Rendimento lordo</span><span><i style="background:${C_NET}"></i>Rendimento netto</span></div>`+
  rows.map(a=>`<div class=bg><div class=bn>${aptTag(a.name,a.id)}</div>${br('Lordo',a.gross,C_GROSS)}${br('Netto',a.net,C_NET)}</div>`).join('')}

const card = (l,v,sub,neg)=>`<div class=card>${l}<b${neg?' class=neg':''}>${v}</b>${sub?`<small>${sub}</small>`:''}</div>`;
const ACOLS = [['name','Appartamento'],['inv','Investimento'],['rent','Canoni annui'],['coll','Canoni incassati'],['exp','Spese locatore'],['tax','Tasse'],['mort','Rata mutuo'],['cf','Cash flow'],['gross','Rend. lordo'],['net','Rend. netto'],['occP','Occupazione'],['sqm','Mq'],['psqm','€/mq anno']];
const RCOLS = [['aname','Appartamento'],['name','Camera'],['beds','Posti letto'],['sqm','Mq'],['occP','Occupazione'],['rent','Canoni annui'],['psqm','€/mq anno']];
const sv = (x,k)=>x[k]==null?-1e15:x[k];

export async function finance(){const cy = +today().slice(0,4),Y = st.FY||cy;st.FY = Y;const fa = FAP.finance;
 const [Ap,C,E] = await Promise.all(['apartments','contracts','expenses'].map(all)),F = await finData(Y),L = fa?F.A.filter(a=>a.id==fa):F.A,T = total(L),
  R = F.R.filter(r=>!fa||r.apt==fa),y0 = Math.min(cy,...C.map(c=>+c.start_date.slice(0,4)).filter(Boolean),...E.map(e=>+String(e.spent_on).slice(0,4)).filter(Boolean),...Ap.flatMap(a=>[a.purchase_date,a.purchase_costs_date,a.renovation_date]).map(d=>+String(d||'').slice(0,4)).filter(Boolean)),
  years = [];for(let y=cy+1;y>=y0;y--)years.push(y);
 const AL = srt(L,SORT.finance,(a,k)=>k=='name'?a.name:sv(a,k)),RL = srt(R.slice().sort((a,b)=>a.aname.localeCompare(b.aname,'it')||String(a.name).localeCompare(String(b.name),'it',{numeric:true})),SORT.finrooms,(r,k)=>k=='aname'||k=='name'?r[k]:sv(r,k));
 const per = F.partial?`dal 01-01-${Y} a oggi`:F.future?`anno ${Y} (previsione dai contratti)`:`anno ${Y}`,noInv = !L.some(a=>a.inv>0),
  mortSub = (T.mortEst?'stimata dalla rata in scheda':'dalle spese «Rata mutuo»')+(T.mInt!=null?' · interessi ~'+eur(r2(T.mInt)):'');
 $('#main').innerHTML=`<div class=fin><h2>Finanza</h2>${aptSel(Ap.slice().sort((a,b)=>a.name.localeCompare(b.name,'it')),fa)} <span class=mnav><button type=button class=sec id=fyp aria-label="Anno precedente">‹</button><select id=fy aria-label=Anno>${years.map(y=>`<option${y==Y?' selected':''}>${y}</option>`).join('')}</select><button type=button class=sec id=fyn aria-label="Anno successivo">›</button></span>
 <p class=mut style="margin:6px 0 0">Periodo: ${per}${fa?'':' · tutti gli appartamenti'}</p>
 ${noInv&&T.invOut?`<p class=card style="margin-top:10px">Nel ${Y} nessuna voce dell’investimento risulta ancora sostenuta: le date indicate nella scheda dell’appartamento sono successive.</p>`:noInv?'<p class=card style="margin-top:10px">Per calcolare i rendimenti inserisci l’<b>investimento</b> (prezzo di acquisto, costi di acquisto, ristrutturazione e arredi) nella scheda dell’appartamento, menù <b>Appartamenti</b> → ✎.</p>':''}
 <div class=cards>${card('Rendimento lordo',pct(T.gross),'canoni annui ÷ investimento')}${card('Rendimento netto',pct(T.net),'(incassati − spese − tasse) ÷ investimento',T.net<0)}${card('Cash flow',eur(r2(T.cf)),'incassi − costi − rata mutuo',T.cf<0)}${card('Tasso di occupazione',pct(T.occP),'posti letto occupati')}${card('Resa per mq',T.psqm==null?'—':eur(r2(T.psqm)),'canoni annui ÷ mq camere')}${T.own>0?card('Rendimento capitale proprio',pct(T.coc),'cash flow ÷ capitale proprio',T.coc<0):''}</div>
 <div class=cards>${card('Investimento',eur(r2(T.inv)),[`voci con data entro il ${Y}`,T.invOut?'alcune voci sono successive':'',T.partInv?'alcuni appartamenti senza investimento':''].filter(Boolean).join(' · '))}${card('Canoni annui',eur(r2(T.rent)),'dovuti da contratti')}${card('Canoni incassati',eur(r2(T.coll)))}${card('Spese locatore',eur(r2(T.exp)),'escluse rata mutuo e IMU')}${card('Tasse',eur(r2(T.tax)),'cedolare secca sui canoni incassati'+(T.imu>0?' + IMU '+eur(r2(T.imu)):' + IMU'))}${card('Rata mutuo',eur(r2(T.mort)),T.mort>0?mortSub:'')}</div>
 <div class=cg><div class=card><h3>Cash flow mensile ${Y}</h3><div class=lgd><span><i style="background:${C_POS}"></i>Positivo</span><span><i style="background:${C_NEG}"></i>Negativo</span></div>${cfChart(T.m)}
  <details style="margin-top:6px"><summary><small>Dati mensili</small></summary><div class=sc><table><tr><th>Mese<th>Incassi<th>Spese<th>Tasse<th>Mutuo<th>Cash flow</tr>${T.m.map((m,i)=>`<tr><td>${MN[i]}<td>${eur(r2(m.coll))}<td>${eur(r2(m.exp))}<td>${eur(r2(m.tax))}<td>${eur(r2(m.mort))}<td><b>${eur(r2(m.cf))}</b></tr>`).join('')}</table></div></details></div>
 ${!fa&&L.length>1?`<div class=card><h3>Rendimenti per appartamento</h3>${yieldChart(L)}</div>`:''}</div>
 <h3 style="margin:18px 0 0">Per appartamento</h3>${sortBar('finance',ACOLS)}<div class=sc><table class=rt><tr>${ACOLS.map(([k,l])=>thS('finance',k,l)).join('')}</tr>
 ${AL.map(a=>`<tr><td data-l="Appartamento">${aptTag(a.name,a.id)}<td data-l="Investimento">${a.inv>0?eur(r2(a.inv)):'—'}<td data-l="Canoni annui">${eur(r2(a.rent))}<td data-l="Canoni incassati">${eur(r2(a.coll))}<td data-l="Spese locatore">${eur(r2(a.exp))}<td data-l="Tasse">${eur(r2(a.tax))}<td data-l="Rata mutuo">${eur(r2(a.mort))}${a.mortEst?' <small class=mut>(stima)</small>':''}<td data-l="Cash flow"><b${a.cf<0?' style="color:#b91c1c"':''}>${eur(r2(a.cf))}</b><td data-l="Rend. lordo">${pct(a.gross)}<td data-l="Rend. netto">${pct(a.net)}<td data-l="Occupazione">${pct(a.occP)}<td data-l="Mq">${a.sqm||'—'}<td data-l="€/mq anno">${a.psqm==null?'—':eur(r2(a.psqm))}</tr>`).join('')}</table></div>
 <h3 style="margin:18px 0 0">Per camera</h3>${R.length?`<div class=sc><table class=rt id=frt><tr>${RCOLS.map(([k,l])=>thS('finrooms',k,l)).join('')}</tr>
 ${RL.map(r=>`<tr><td data-l="Appartamento">${aptTag(r.aname,r.apt)}<td data-l="Camera">${esc(r.name)}<td data-l="Posti letto">${r.beds}<td data-l="Mq">${r.sqm||'—'}<td data-l="Occupazione">${pct(r.occP)}<td data-l="Canoni annui">${eur(r2(r.rent))}<td data-l="€/mq anno">${r.psqm==null?'—':eur(r2(r.psqm))}</tr>`).join('')}</table></div>`:'<p class=mut>Nessuna camera censita.</p>'}
 <details class=card style="margin-top:14px"><summary><b>Come sono calcolati gli indicatori</b></summary><ul class=fnote>
  <li><b>Investimento</b>: prezzo di acquisto (o valore di mercato) + costi di acquisto + ristrutturazione e arredi, dalla scheda dell’appartamento. Ogni voce conta solo se la sua data è nell’anno selezionato o in un anno precedente; una voce senza data conta sempre.</li>
  <li><b>Canoni annui</b>: canoni generati per i mesi dell’anno; per i mesi non ancora generati si usa il canone mensile dei contratti attivi.</li>
  <li><b>Canoni incassati</b>: pagamenti registrati sui canoni dei mesi dell’anno (fino al mese corrente).</li>
  <li><b>Spese locatore</b>: «Importo locatore» delle spese con scadenza nel periodo, escluse le tipologie «Rata mutuo» e «IMU». Le spese a carico degli inquilini sono considerate partite di giro.</li>
  <li><b>Tasse</b>: cedolare secca del contratto applicata ai canoni incassati (contratti senza cedolare: nessuna tassa stimata) + spese di tipologia «IMU» con scadenza nel periodo.</li>
  <li><b>Rata mutuo</b>: spese di tipologia «Rata mutuo» con scadenza nel periodo; se non ce ne sono, rata mensile della scheda × mesi trascorsi (stima).</li>
  <li><b>Rendimento lordo</b> = canoni annui ÷ investimento · <b>Rendimento netto</b> = (canoni incassati − spese locatore − tasse) ÷ investimento · <b>Cash flow</b> = canoni incassati − spese locatore − tasse − rata mutuo${T.own>0?' · <b>Rendimento capitale proprio</b> = cash flow ÷ capitale proprio versato':''}.</li>
  <li><b>Tasso di occupazione</b>: giorni-letto occupati dai contratti ÷ (posti letto × giorni del periodo), per camera e per appartamento.</li>
  <li><b>Resa per mq</b>: canoni annui ÷ metri quadri delle camere.</li>
  <li>Con «Tutti gli appartamenti» i rendimenti considerano solo gli appartamenti con l’investimento indicato.</li></ul></details></div>`;
 const go = y=>{st.FY = y;finance()};
 $('#fy').onchange = e=>go(+e.target.value);$('#fyp').onclick = ()=>go(Y-1);$('#fyn').onclick = ()=>{if(Y<cy+1)go(Y+1)};$('#fyn').disabled = Y>=cy+1;
 $('#fa').onchange = e=>{FAP.finance = e.target.value;finance()};
 sortWire('finance',finance);document.querySelectorAll('#frt th[data-s]').forEach(th=>th.onclick=()=>{const c = SORT.finrooms,k = th.dataset.s;SORT.finrooms = !c||c.k!=k?{k,d:1}:c.d==1?{k,d:-1}:null;finance()});
 const box = $('#cfc');if(box){const tip = box.querySelector('.ftip'),show = el=>{const i = +el.dataset.i,m = T.m[i],bb = box.getBoundingClientRect(),rb = el.getBoundingClientRect();
   tip.innerHTML = `<b>${MN[i]} ${Y} · ${eur(r2(m.cf))}</b>Incassi ${eur(r2(m.coll))}<br>Spese locatore −${eur(r2(m.exp))}<br>Tasse −${eur(r2(m.tax))}<br>Rata mutuo −${eur(r2(m.mort))}`;tip.hidden = false;
   const x = rb.left-bb.left+rb.width/2,tw = tip.offsetWidth;tip.style.left = Math.max(0,Math.min(bb.width-tw,x-tw/2))+'px';tip.style.top = '0px'};
  box.querySelectorAll('.hit').forEach(h=>{h.onpointerenter = ()=>show(h);h.onpointerdown = ()=>show(h)});box.onpointerleave = ()=>tip.hidden = true}}
