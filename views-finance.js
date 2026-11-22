// Menù Finanza: rendimenti, cash flow, tasso di occupazione e resa per mq, con simulazione dell'anno intero
import { all } from './db.js';
import { SORT, st } from './state.js';
import { aptSel, aptTag, sortBar, sortWire, srt, thS } from './ui.js';
import { $, FAP, esc, eur, today } from './util.js';

const MN = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const C_POS = '#2a78d6', C_NEG = '#e34948', C_GROSS = '#2a78d6', C_NET = '#eb6834', C_SPOS = '#9ec2ee', C_SNEG = '#f3aaa9';
const r2 = v=>Math.round(v*100)/100, n0 = v=>+v||0, pad = n=>String(n).padStart(2,'0');
const days = (a,b)=>a>b?0:Math.round((Date.parse(b)-Date.parse(a))/864e5)+1;
const pct = v=>v==null||!isFinite(v)?'—':v.toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
const div = (a,b)=>b>0?a/b*100:null;
const isMortgage = t=>/^rata\s+mutuo$/i.test((t?.name||'').trim()), isImu = t=>/^imu$/i.test((t?.name||'').trim());
const lastDay = (y,m)=>new Date(Date.UTC(y,m+1,0)).toISOString().slice(0,10);
const KS = ['coll','exp','tax','mort'];
const blank = ()=>({coll:0,exp:0,tax:0,mort:0});
const blankM = ()=>Array.from({length:12},()=>({...blank(),s:blank()}));
const simAmt = s=>KS.reduce((x,k)=>x+Math.abs(s[k]),0)>.005;

// Calcolo degli indicatori dell'anno Y per ogni appartamento e camera.
// sim = simulazione: tutti i canoni dell'anno pagati, e per i mesi successivi a quello corrente le spese del locatore
// (rata mutuo e IMU comprese) già registrate per quell'anno o, se mancano, quelle dello stesso mese dell'anno precedente.
// Ogni importo simulato è sommato anche in .s, per distinguerlo da quelli reali.
export async function finData(Y,sim){
 const [Ap,Ro,C,D,Pa,E,Ty] = await Promise.all(['apartments','rooms','contracts','rent_dues','payments','expenses','expense_types'].map(all));
 const t0 = today(), cy = +t0.slice(0,4), ys = Y+'-01-01', ye = Y+'-12-31', pe = Y==cy?t0:ye, pm = pe.slice(0,7), lastI = +pm.slice(5)-1,
  ci = Y<cy?11:Y==cy?lastI:-1, realEnd = Y<cy?ye:Y==cy?t0:'';   // in simulazione: ultimo mese reale e ultimo giorno reale
 const mortT = new Set(Ty.filter(isMortgage).map(t=>t.id)), imuT = new Set(Ty.filter(isImu).map(t=>t.id)), paid = new Map();
 const kind = e=>mortT.has(e.type_id)?'mort':imuT.has(e.type_id)?'imu':'exp', val = e=>kind(e)=='exp'?n0(e.landlord_amount):n0(e.amount)+n0(e.landlord_amount);
 // Una voce dell'investimento conta se la sua data è nell'anno scelto o prima (senza data: sempre)
 const upTo = d=>!d||+String(d).slice(0,4)<=Y;
 for(const p of Pa)paid.set(p.due_id,(paid.get(p.due_id)||0)+n0(p.amount));
 const A = new Map(Ap.map(a=>{const inv = (upTo(a.purchase_date)?n0(a.purchase_price):0)+(upTo(a.purchase_costs_date)?n0(a.purchase_costs):0)+(upTo(a.renovation_date)?n0(a.renovation):0),
   invOut = [a.purchase_date,a.purchase_costs_date,a.renovation_date].some((d,j)=>d&&!upTo(d)&&n0([a.purchase_price,a.purchase_costs,a.renovation][j])>0);
  return [a.id,{id:a.id,name:a.name,inv,invOut,imu:0,own:n0(a.own_capital),mp:n0(a.mortgage_payment),mi:n0(a.mortgage_interest),rent:0,...blank(),s:blank(),mortEst:false,occSim:false,cap:0,occ:0,sqm:0,m:blankM()}]}));
 // Somma un importo nel mese i dell'appartamento a (k: coll, exp, tax, mort); s = importo simulato
 const add = (a,i,k,v,s)=>{if(!v)return;a[k] += v;a.m[i][k] += v;if(s){a.s[k] += v;a.m[i].s[k] += v}};
 const RM = new Map(Ro.map(r=>[r.id,{id:r.id,apt:r.apartment_id,name:r.name,beds:Math.max(1,n0(r.beds)||1),sqm:n0(r.sqm),rent:0,occ:0,cap:0}]));
 // Canoni annui: canoni generati dell'anno + mesi di contratto non ancora generati (al canone del contratto)
 const seen = new Set();
 for(const d of D){if(d.month.slice(0,4)!=Y)continue;const c = C.find(x=>x.id===d.contract_id),a = c&&A.get(c.apartment_id);if(!a)continue;
  const mo = d.month.slice(0,7),i = +mo.slice(5)-1,ced = n0(c.cedolare)/100,amt = n0(d.amount);seen.add(c.id+'|'+mo);a.rent += amt;if(c.room_id&&RM.has(c.room_id))RM.get(c.room_id).rent += amt;
  const p = paid.get(d.id)||0;
  if(mo<=pm||sim){add(a,i,'coll',p);add(a,i,'tax',p*ced)}
  if(sim&&amt-p>.005){add(a,i,'coll',amt-p,1);add(a,i,'tax',(amt-p)*ced,1)}}
 for(const c of C){const a = A.get(c.apartment_id);if(!a)continue;
  for(let i=0;i<12;i++){const ms = `${Y}-${pad(i+1)}-01`,me = lastDay(Y,i);if(seen.has(c.id+'|'+ms.slice(0,7))||c.start_date>me||(c.end_date&&c.end_date<ms))continue;
   const amt = n0(c.monthly_rent);a.rent += amt;if(c.room_id&&RM.has(c.room_id))RM.get(c.room_id).rent += amt;
   if(sim){add(a,i,'coll',amt,1);add(a,i,'tax',amt*n0(c.cedolare)/100,1)}}}
 // Spese del locatore (esclusa la rata del mutuo), IMU tra le tasse, rate del mutuo registrate tra le spese
 const hasMort = new Set(), put = (a,i,e,s)=>{const k = kind(e),v = val(e);if(k=='imu'){a.imu += v;add(a,i,'tax',v,s)}else add(a,i,k,v,s)};
 const reg = new Map(), prev = new Map();   // spese dei mesi futuri (simulazione): registrate / anno precedente, per appartamento|mese|tipologia
 const bucket = (M,e,i)=>{const key = e.apartment_id+'|'+i+'|'+e.type_id;if(!M.has(key))M.set(key,[]);M.get(key).push(e)};
 for(const e of E){const a = A.get(e.apartment_id);if(!a||!e.spent_on)continue;const yr = +e.spent_on.slice(0,4),i = +e.spent_on.slice(5,7)-1;
  if(sim){if(yr==Y-1&&i>ci)bucket(prev,e,i);if(yr!=Y)continue;
   if(e.spent_on<=realEnd){put(a,i,e,0);if(mortT.has(e.type_id))hasMort.add(a.id)}
   else if(i<=ci)put(a,i,e,1);          // resto del mese corrente: spese già registrate, non ancora scadute
   else bucket(reg,e,i)}
  else{if(e.spent_on<ys||e.spent_on>pe)continue;put(a,i,e,0);if(mortT.has(e.type_id))hasMort.add(a.id)}}
 if(sim){const keys = new Set([...reg.keys(),...prev.keys()]),mortFut = new Set();
  for(const key of keys){const [aid,i] = key.split('|').map(Number),a = A.get(aid),L = reg.get(key)||prev.get(key);for(const e of L){put(a,i,e,1);if(mortT.has(e.type_id))mortFut.add(aid+'|'+i)}}
  // Rata della scheda: nei mesi reali se non ci sono rate registrate (come senza simulazione), nei mesi futuri se non ce n'è una registrata o dell'anno precedente
  for(const a of A.values())if(a.mp>0){if(!hasMort.has(a.id))for(let i=0;i<=ci;i++){add(a,i,'mort',a.mp);a.mortEst = true}
   for(let i=ci+1;i<12;i++)if(!mortFut.has(a.id+'|'+i)){add(a,i,'mort',a.mp,1);a.mortEst = true}}}
 // Senza rate registrate si usa la rata mensile della scheda appartamento per i mesi trascorsi
 else for(const a of A.values())if(!hasMort.has(a.id)&&a.mp>0){a.mortEst = true;for(let i=0;i<=lastI;i++)add(a,i,'mort',a.mp)}
 // Tasso di occupazione per posti letto: giorni occupati ÷ (posti letto × giorni del periodo); in simulazione l'anno intero
 const oe = sim?ye:pe,nd = days(ys,oe), occOf = c=>days(c.start_date>ys?c.start_date:ys,c.end_date&&c.end_date<oe?c.end_date:oe);
 for(const r of RM.values()){r.cap = r.beds*nd;r.occ = Math.min(r.cap,C.filter(c=>c.room_id===r.id).reduce((s,c)=>s+occOf(c),0))}
 for(const a of A.values()){const rs = [...RM.values()].filter(r=>r.apt===a.id),ap = Ap.find(x=>x.id===a.id),cs = C.filter(c=>c.apartment_id===a.id);
  a.sqm = rs.reduce((s,r)=>s+r.sqm,0);a.occSim = sim&&oe>realEnd&&cs.length>0;
  if(rs.length){a.cap = rs.reduce((s,r)=>s+r.cap,0);a.occ = Math.min(a.cap,rs.reduce((s,r)=>s+r.occ,0)+cs.filter(c=>!c.room_id||!RM.has(c.room_id)).reduce((s,c)=>s+occOf(c),0))}
  else{a.cap = Math.max(1,n0(ap.beds)||n0(ap.rooms)||1)*nd;a.occ = Math.min(a.cap,cs.reduce((s,c)=>s+occOf(c),0))}}
 const kpi = a=>{a.cf = a.coll-a.exp-a.tax-a.mort;a.gross = div(a.rent,a.inv);a.net = div(a.coll-a.exp-a.tax,a.inv);a.coc = div(a.cf,a.own);a.occP = div(a.occ,a.cap);a.psqm = a.sqm>0?a.rent/a.sqm:null;
  a.mInt = a.mp>0&&a.mi>0?a.mort*a.mi/a.mp:null;a.m.forEach(m=>{m.cf = m.coll-m.exp-m.tax-m.mort;m.sim = simAmt(m.s)});a.simAny = simAmt(a.s);return a};
 const L = [...A.values()].map(kpi).sort((x,y)=>x.name.localeCompare(y.name,'it'));
 for(const r of RM.values()){r.occP = div(r.occ,r.cap);r.psqm = r.sqm>0?r.rent/r.sqm:null;r.aname = A.get(r.apt)?.name||''}
 return {Y,pe,sim:!!sim,partial:Y==cy,future:Y>cy,lastI,ci,A:L,R:[...RM.values()].filter(r=>A.has(r.apt))}}

// Somma degli appartamenti scelti; i rendimenti usano solo quelli con l'investimento indicato
function total(L){const T = {rent:0,...blank(),s:blank(),imu:0,invOut:L.some(a=>a.invOut),cap:0,occ:0,sqm:0,inv:0,own:0,mInt:null,mortEst:L.some(a=>a.mortEst),occSim:L.some(a=>a.occSim),m:blankM()},I = {rent:0,netN:0,inv:0},O = {cf:0,own:0};
 for(const a of L){for(const k of['rent','coll','exp','tax','imu','mort','cap','occ','sqm','inv','own'])T[k] += a[k];for(const k of KS)T.s[k] += a.s[k];
  a.m.forEach((m,i)=>{for(const k of KS){T.m[i][k] += m[k];T.m[i].s[k] += m.s[k]}});
  if(a.mInt!=null)T.mInt = (T.mInt||0)+a.mInt;
  if(a.inv>0){I.rent += a.rent;I.netN += a.coll-a.exp-a.tax;I.inv += a.inv}
  if(a.own>0){O.cf += a.cf;O.own += a.own}}
 T.cf = T.coll-T.exp-T.tax-T.mort;T.gross = div(I.rent,I.inv);T.net = div(I.netN,I.inv);T.coc = div(O.cf,O.own);T.occP = div(T.occ,T.cap);T.psqm = T.sqm>0?T.rent/T.sqm:null;
 T.partInv = L.some(a=>a.inv>0)&&L.some(a=>!(a.inv>0));T.m.forEach(m=>{m.cf = m.coll-m.exp-m.tax-m.mort;m.sim = simAmt(m.s)});T.simAny = simAmt(T.s);return T}

const niceStep = v=>{const p = Math.pow(10,Math.floor(Math.log10(v))),f = v/p;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p};
const eurK = v=>Math.abs(v)>=1000?(v/1000).toLocaleString('it-IT',{maximumFractionDigits:1})+'k':String(Math.round(v));
// Barra con l'estremità dei dati arrotondata e la base appoggiata sullo zero
function bar(x,w,y0,y1,c){const h = Math.abs(y1-y0);if(h<.5)return'';const r = Math.min(4,w/2,h),up = y1<y0;
 return up?`<path d="M${x},${y0}V${y1+r}Q${x},${y1} ${x+r},${y1}H${x+w-r}Q${x+w},${y1} ${x+w},${y1+r}V${y0}Z" fill="${c}"/>`
  :`<path d="M${x},${y0}V${y1-r}Q${x},${y1} ${x+r},${y1}H${x+w-r}Q${x+w},${y1} ${x+w},${y1-r}V${y0}Z" fill="${c}"/>`}
// Mesi simulati: tinta chiara con righe oblique della stessa tinta (si distinguono anche senza colori)
const PATS = `<defs><pattern id=simP width=6 height=6 patternUnits=userSpaceOnUse patternTransform="rotate(45)"><rect width=6 height=6 fill="${C_SPOS}"/><rect width=2 height=6 fill="${C_POS}"/></pattern>`+
 `<pattern id=simN width=6 height=6 patternUnits=userSpaceOnUse patternTransform="rotate(45)"><rect width=6 height=6 fill="${C_SNEG}"/><rect width=2 height=6 fill="${C_NEG}"/></pattern></defs>`;
const swatch = (c,s)=>s?`background:repeating-linear-gradient(45deg,${c} 0 2px,${c==C_POS?C_SPOS:C_SNEG} 2px 6px)`:`background:${c}`;
function cfChart(M){const W = 720,H = 240,L = 50,Rr = 6,T = 10,B = 26,pw = W-L-Rr,ph = H-T-B,v = M.map(m=>m.cf),hi = Math.max(0,...v),lo = Math.min(0,...v);
 if(Math.abs(hi)<.005&&Math.abs(lo)<.005)return'<p class=mut>Nessun movimento nell’anno selezionato.</p>';
 const st = niceStep((hi-lo)/4||1),top = Math.ceil(hi/st)*st,bot = Math.floor(lo/st)*st,y = x=>T+(top-x)/(top-bot||1)*ph,bw = pw/12,w = Math.min(30,bw*.62);let g = '';
 for(let t=bot;t<=top+st/2;t+=st)g += `<line x1=${L} x2=${W-Rr} y1=${y(t)} y2=${y(t)} stroke="${Math.abs(t)<1e-9?'#6b7280':'#e5e7eb'}" stroke-width=1 /><text x=${L-6} y=${y(t)+4} text-anchor=end font-size=11 fill="#6b7280">${eurK(t)}</text>`;
 const bars = M.map((m,i)=>bar(L+bw*i+(bw-w)/2,w,y(0),y(m.cf),m.sim?(m.cf>=0?'url(#simP)':'url(#simN)'):(m.cf>=0?C_POS:C_NEG))).join(''),
  lab = M.map((m,i)=>`<text x=${L+bw*i+bw/2} y=${H-8} text-anchor=middle font-size=11 fill="${m.sim?'#7c3aed':'#4b5563'}">${MN[i]}</text>`).join(''),
  hit = M.map((m,i)=>`<rect class=hit data-i=${i} x=${L+bw*i} y=${T} width=${bw} height=${ph} aria-label="${MN[i]}: ${eur(r2(m.cf))}${m.sim?' (simulato)':''}"></rect>`).join('');
 return`<div class=fch id=cfc><svg viewBox="0 0 ${W} ${H}" role=img aria-label="Cash flow mensile">${PATS}${g}${bars}${lab}${hit}</svg><div class=ftip hidden></div></div>`}
function yieldChart(L){const rows = L.filter(a=>a.inv>0);if(!rows.length)return'<p class=mut>Inserisci l’investimento nella scheda degli appartamenti per confrontarne i rendimenti.</p>';
 const mx = Math.max(.0001,...rows.flatMap(a=>[a.gross||0,a.net||0]));
 const br = (n,v,c,s)=>`<div class=br><span class=bl>${n}</span><div class=bt><div style="width:${Math.max(0,v||0)/mx*100}%;background:${s?`repeating-linear-gradient(45deg,${c} 0 2px,#f8c9b4 2px 6px)`:c}"></div></div><span class="bv${s?' sim':''}">${pct(v)}</span></div>`;
 return`<div class=lgd><span><i style="background:${C_GROSS}"></i>Rendimento lordo</span><span><i style="background:${C_NET}"></i>Rendimento netto</span></div>`+
  rows.map(a=>`<div class=bg><div class=bn>${aptTag(a.name,a.id)}</div>${br('Lordo',a.gross,C_GROSS)}${br('Netto',a.net,C_NET,a.simAny)}</div>`).join('')}

// Card: valore in viola con l'etichetta «simulato» quando comprende importi simulati
const card = (l,v,sub,neg,sim)=>`<div class=card>${l}<b class="${sim?'sim':neg?'neg':''}">${v}</b>${sim||sub?`<small>${sim?'<span class=simt>simulato</span> ':''}${sub||''}</small>`:''}</div>`;
const ACOLS = [['name','Appartamento'],['inv','Investimento'],['rent','Canoni annui'],['coll','Canoni incassati'],['exp','Spese locatore'],['tax','Tasse'],['mort','Rata mutuo'],['cf','Cash flow'],['gross','Rend. lordo'],['net','Rend. netto'],['occP','Occupazione'],['sqm','Mq'],['psqm','€/mq anno']];
const RCOLS = [['aname','Appartamento'],['name','Camera'],['beds','Posti letto'],['sqm','Mq'],['occP','Occupazione'],['rent','Canoni annui'],['psqm','€/mq anno']];
const sv = (x,k)=>x[k]==null?-1e15:x[k];
const SIMLBL = {coll:'canoni',exp:'spese',tax:'tasse',mort:'mutuo'};

export async function finance(){const cy = +today().slice(0,4),Y = st.FY||cy;st.FY = Y;const fa = FAP.finance,sim = !!st.FSIM;
 const [Ap,C,E] = await Promise.all(['apartments','contracts','expenses'].map(all)),F = await finData(Y,sim),L = fa?F.A.filter(a=>a.id==fa):F.A,T = total(L),
  R = F.R.filter(r=>!fa||r.apt==fa),y0 = Math.min(cy,...C.map(c=>+c.start_date.slice(0,4)).filter(Boolean),...E.map(e=>+String(e.spent_on).slice(0,4)).filter(Boolean),...Ap.flatMap(a=>[a.purchase_date,a.purchase_costs_date,a.renovation_date]).map(d=>+String(d||'').slice(0,4)).filter(Boolean)),
  years = [];for(let y=cy+1;y>=y0;y--)years.push(y);
 const AL = srt(L,SORT.finance,(a,k)=>k=='name'?a.name:sv(a,k)),RL = srt(R.slice().sort((a,b)=>a.aname.localeCompare(b.aname,'it')||String(a.name).localeCompare(String(b.name),'it',{numeric:true})),SORT.finrooms,(r,k)=>k=='aname'||k=='name'?r[k]:sv(r,k));
 const per = sim?`anno ${Y} intero, in simulazione`:F.partial?`dal 01-01-${Y} a oggi`:F.future?`anno ${Y} (previsione dai contratti)`:`anno ${Y}`,noInv = !L.some(a=>a.inv>0),
  mortSub = (T.mortEst?'stimata dalla rata in scheda':'dalle spese «Rata mutuo»')+(T.mInt!=null?' · interessi ~'+eur(r2(T.mInt)):''),
  S = k=>T.s[k]>.005, sCf = T.simAny, sc = (a,k)=>a.s[k]>.005?' class=sim':'';
 $('#main').innerHTML=`<div class=fin><h2>Finanza</h2>${aptSel(Ap.slice().sort((a,b)=>a.name.localeCompare(b.name,'it')),fa)} <span class=mnav><button type=button class=sec id=fyp aria-label="Anno precedente">‹</button><select id=fy aria-label=Anno>${years.map(y=>`<option${y==Y?' selected':''}>${y}</option>`).join('')}</select><button type=button class=sec id=fyn aria-label="Anno successivo">›</button></span>
 <button type=button id=fsim class="${sim?'simon':'sec'}" aria-pressed=${sim}>${sim?'✓ Simulazione attiva':'Simulazione'}</button>
 <p class=mut style="margin:6px 0 0">Periodo: ${per}${fa?'':' · tutti gli appartamenti'}</p>
 ${sim?`<p class="card simb">Simulazione: tutti i canoni dell’anno sono considerati incassati (con la cedolare); ${F.ci>=11?'l’anno è concluso, quindi si simulano solo i canoni non ancora pagati':`per ${F.ci<0?'tutti i mesi':F.ci==10?'il mese di dicembre':'i mesi da '+MN[F.ci+1]+' a Dic'} le spese del locatore, l’IMU e la rata del mutuo sono quelle già registrate per il ${Y} o, se mancano, quelle dello stesso mese del ${Y-1}`}. <span class=sim style="font-weight:700">I valori in viola</span> e le barre a righe comprendono importi simulati.</p>`:''}
 ${noInv&&T.invOut?`<p class=card style="margin-top:10px">Nel ${Y} nessuna voce dell’investimento risulta ancora sostenuta: le date indicate nella scheda dell’appartamento sono successive.</p>`:noInv?'<p class=card style="margin-top:10px">Per calcolare i rendimenti inserisci l’<b>investimento</b> (prezzo di acquisto, costi di acquisto, ristrutturazione e arredi) nella scheda dell’appartamento, menù <b>Appartamenti</b> → ✎.</p>':''}
 <div class=cards>${card('Rendimento lordo',pct(T.gross),'canoni annui ÷ investimento')}${card('Rendimento netto',pct(T.net),'(incassati − spese − tasse) ÷ investimento',T.net<0,sCf)}${card('Cash flow',eur(r2(T.cf)),'incassi − costi − rata mutuo',T.cf<0,sCf)}${card('Tasso di occupazione',pct(T.occP),'posti letto occupati',0,T.occSim)}${card('Resa per mq',T.psqm==null?'—':eur(r2(T.psqm)),'canoni annui ÷ mq camere')}${T.own>0?card('Rendimento capitale proprio',pct(T.coc),'cash flow ÷ capitale proprio',T.coc<0,sCf):''}</div>
 <div class=cards>${card('Investimento',eur(r2(T.inv)),[`voci con data entro il ${Y}`,T.invOut?'alcune voci sono successive':'',T.partInv?'alcuni appartamenti senza investimento':''].filter(Boolean).join(' · '))}${card('Canoni annui',eur(r2(T.rent)),'dovuti da contratti')}${card('Canoni incassati',eur(r2(T.coll)),S('coll')?'di cui simulati '+eur(r2(T.s.coll)):'',0,S('coll'))}${card('Spese locatore',eur(r2(T.exp)),'escluse rata mutuo e IMU'+(S('exp')?' · simulate '+eur(r2(T.s.exp)):''),0,S('exp'))}${card('Tasse',eur(r2(T.tax)),'cedolare secca sui canoni incassati'+(T.imu>0?' + IMU '+eur(r2(T.imu)):' + IMU')+(S('tax')?' · simulate '+eur(r2(T.s.tax)):''),0,S('tax'))}${card('Rata mutuo',eur(r2(T.mort)),[T.mort>0?mortSub:'',S('mort')?'simulata '+eur(r2(T.s.mort)):''].filter(Boolean).join(' · '),0,S('mort'))}</div>
 <div class=cg><div class=card><h3>Cash flow mensile ${Y}</h3><div class=lgd><span><i style="${swatch(C_POS)}"></i>Positivo</span><span><i style="${swatch(C_NEG)}"></i>Negativo</span>${sim?`<span><i style="${swatch(C_POS,1)}"></i>Positivo simulato</span><span><i style="${swatch(C_NEG,1)}"></i>Negativo simulato</span>`:''}</div>${cfChart(T.m)}
  <details style="margin-top:6px"><summary><small>Dati mensili</small></summary><div class=sc><table><tr><th>Mese<th>Incassi<th>Spese<th>Tasse<th>Mutuo<th>Cash flow${sim?'<th>Dati':''}</tr>${T.m.map((m,i)=>`<tr${m.sim?' class=sim':''}><td>${MN[i]}<td>${eur(r2(m.coll))}<td>${eur(r2(m.exp))}<td>${eur(r2(m.tax))}<td>${eur(r2(m.mort))}<td><b>${eur(r2(m.cf))}</b>${sim?`<td>${m.sim?'simulati: '+KS.filter(k=>m.s[k]>.005).map(k=>SIMLBL[k]).join(', '):'reali'}`:''}</tr>`).join('')}</table></div></details></div>
 ${!fa&&L.length>1?`<div class=card><h3>Rendimenti per appartamento</h3>${yieldChart(L)}</div>`:''}</div>
 <h3 style="margin:18px 0 0">Per appartamento</h3>${sortBar('finance',ACOLS)}<div class=sc><table class=rt><tr>${ACOLS.map(([k,l])=>thS('finance',k,l)).join('')}</tr>
 ${AL.map(a=>`<tr><td data-l="Appartamento">${aptTag(a.name,a.id)}<td data-l="Investimento">${a.inv>0?eur(r2(a.inv)):'—'}<td data-l="Canoni annui">${eur(r2(a.rent))}<td data-l="Canoni incassati"${sc(a,'coll')}>${eur(r2(a.coll))}<td data-l="Spese locatore"${sc(a,'exp')}>${eur(r2(a.exp))}<td data-l="Tasse"${sc(a,'tax')}>${eur(r2(a.tax))}<td data-l="Rata mutuo"${sc(a,'mort')}>${eur(r2(a.mort))}${a.mortEst?' <small class=mut>(stima)</small>':''}<td data-l="Cash flow"${a.simAny?' class=sim':''}><b${a.cf<0&&!a.simAny?' style="color:#b91c1c"':''}>${eur(r2(a.cf))}</b><td data-l="Rend. lordo">${pct(a.gross)}<td data-l="Rend. netto"${a.simAny?' class=sim':''}>${pct(a.net)}<td data-l="Occupazione"${a.occSim?' class=sim':''}>${pct(a.occP)}<td data-l="Mq">${a.sqm||'—'}<td data-l="€/mq anno">${a.psqm==null?'—':eur(r2(a.psqm))}</tr>`).join('')}</table></div>
 <h3 style="margin:18px 0 0">Per camera</h3>${R.length?`<div class=sc><table class=rt id=frt><tr>${RCOLS.map(([k,l])=>thS('finrooms',k,l)).join('')}</tr>
 ${RL.map(r=>`<tr><td data-l="Appartamento">${aptTag(r.aname,r.apt)}<td data-l="Camera">${esc(r.name)}<td data-l="Posti letto">${r.beds}<td data-l="Mq">${r.sqm||'—'}<td data-l="Occupazione"${T.occSim?' class=sim':''}>${pct(r.occP)}<td data-l="Canoni annui">${eur(r2(r.rent))}<td data-l="€/mq anno">${r.psqm==null?'—':eur(r2(r.psqm))}</tr>`).join('')}</table></div>`:'<p class=mut>Nessuna camera censita.</p>'}
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
  <li>Con «Tutti gli appartamenti» i rendimenti considerano solo gli appartamenti con l’investimento indicato.</li>
  <li><b>Simulazione</b>: tutti i canoni dell’anno sono considerati incassati, con la cedolare; per i mesi successivi a quello corrente si usano, per ogni tipologia, le spese del locatore (comprese IMU e rata del mutuo) già registrate per l’anno o, se mancano, quelle dello stesso mese dell’anno precedente; senza rate del mutuo registrate si usa la rata mensile della scheda. Il tasso di occupazione considera l’anno intero, supponendo che i contratti proseguano come indicato. I valori che comprendono importi simulati sono in viola, i mesi simulati del grafico sono a righe.</li></ul></details></div>`;
 const go = y=>{st.FY = y;finance()};
 $('#fy').onchange = e=>go(+e.target.value);$('#fyp').onclick = ()=>go(Y-1);$('#fyn').onclick = ()=>{if(Y<cy+1)go(Y+1)};$('#fyn').disabled = Y>=cy+1;
 $('#fa').onchange = e=>{FAP.finance = e.target.value;finance()};$('#fsim').onclick = ()=>{st.FSIM = !sim;finance()};
 sortWire('finance',finance);document.querySelectorAll('#frt th[data-s]').forEach(th=>th.onclick=()=>{const c = SORT.finrooms,k = th.dataset.s;SORT.finrooms = !c||c.k!=k?{k,d:1}:c.d==1?{k,d:-1}:null;finance()});
 const box = $('#cfc');if(box){const tip = box.querySelector('.ftip'),sx = (m,k)=>m.s[k]>.005?` <i>(sim. ${eur(r2(m.s[k]))})</i>`:'',show = el=>{const i = +el.dataset.i,m = T.m[i],bb = box.getBoundingClientRect(),rb = el.getBoundingClientRect();
   tip.innerHTML = `<b>${MN[i]} ${Y} · ${eur(r2(m.cf))}${m.sim?' · simulato':''}</b>Incassi ${eur(r2(m.coll))}${sx(m,'coll')}<br>Spese locatore −${eur(r2(m.exp))}${sx(m,'exp')}<br>Tasse −${eur(r2(m.tax))}${sx(m,'tax')}<br>Rata mutuo −${eur(r2(m.mort))}${sx(m,'mort')}`;tip.hidden = false;
   const x = rb.left-bb.left+rb.width/2,tw = tip.offsetWidth;tip.style.left = Math.max(0,Math.min(bb.width-tw,x-tw/2))+'px';tip.style.top = '0px'};
  box.querySelectorAll('.hit').forEach(h=>{h.onpointerenter = ()=>show(h);h.onpointerdown = ()=>show(h)});box.onpointerleave = ()=>tip.hidden = true}}
