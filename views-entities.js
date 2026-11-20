// Menù Appartamenti, Camere, Inquilini, Contratti e Spese: elenco e modulo generici
import { api } from './api.js';
import { all } from './db.js';
import { roomInfo } from './rules.js';
import { R, S } from './schema.js';
import { SORT, st } from './state.js';
import { aptCol, aptSel, aptTag, bdg, mn, sortBar, sortWire, srt, thS, tnTag } from './ui.js';
import { $, FAP, FPER, esc, eur, fd, sumk, today } from './util.js';
import { attach } from './views-attachments.js';
import { alloc, collectDlg } from './views-expenses.js';

export async function form(t,F,row={},after){const d=$('#dlg');let h='';
 for(const[k,l,ty='text']of F){let i;
  if(ty.startsWith('ref:')){const rt=ty.slice(4);i=`<select name=${k}><option value="">—</option>${(await api(rt)).map(x=>`<option value=${x.id} ${x.id==row[k]?'selected':''}>${esc(R[rt](x))}</option>`).join('')}</select>`}
  else if(ty.startsWith('sel:'))i=`<select name=${k}>${ty.slice(4).split(',').map(o=>`<option ${o==row[k]?'selected':''}>${o}</option>`).join('')}</select>`;
  else if(ty=='number')i=`<input name=${k} type=text inputmode=decimal autocomplete=off value="${esc(row[k])}">`;
  else if(ty=='color')i=`<input name=${k} type=color value="${esc(row[k]||(row.id?aptCol(row.id):st.APN))}">`;
  else i=`<input name=${k} type=${ty} value="${esc(row[k])}">`;h+=`<label>${l}${i}</label>`}
 d.onclick=null;d.innerHTML=`<form method=dialog><div class=fb><h3>${row.id?'Modifica':'Nuovo'}</h3><div class=g>${h}</div></div><div class=ft><button value=ok>Salva</button><button value=x class=sec formnovalidate>Annulla</button></div></form>`;d.showModal();
 const A=d.querySelector('[name=apartment_id]'),Rm=d.querySelector('[name=room_id]');
 if(A&&Rm){const RS=await api('rooms'),fill=sel=>{Rm.innerHTML='<option value="">—</option>'+RS.filter(r=>r.apartment_id==A.value).map(r=>`<option value=${r.id} ${r.id==sel?'selected':''}>${esc(r.name)}</option>`).join('')};fill(row.room_id);A.onchange=()=>fill()}
 d.querySelector('form').onsubmit=async e=>{if(e.submitter?.value==='x')return;e.preventDefault();
  try{await api(t+(row.id?'/'+row.id:''),{method:row.id?'PUT':'POST',body:{...row,...Object.fromEntries(new FormData(e.target))}});d.close();after()}catch{}}}
export function filt(){$('#q').oninput=e=>document.querySelectorAll('tr[data-f]').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(e.target.value.toLowerCase()))}
export async function list(t){let rows;const[ti,F]=S[t],raw=await api(t),ref={},AP=await api('apartments'),fa=FAP[t]||'',RM=t=='rooms'?await roomInfo(st.curM):{},SD=t=='expenses'?await api('shares_due'):[],CT=t=='tenants'?await api('contracts'):[],DC=t=='expenses'?(await all('documents')).reduce((m,d)=>(m[d.expense_id]=(m[d.expense_id]||0)+1,m),{}):{};
 const inc=r=>{const q=SD.filter(s=>s.expense_id===r.id);if(!(r.amount>0))return'—';if(!q.length)return'Non ripartita';const m=sumk(q,'remaining');return m>0.004?(r.spent_on<today()?'In ritardo ':'Da incassare ')+eur(m):'Incassata ✓'};
 rows=raw;if(t=='rooms'&&fa)rows=rows.filter(r=>r.apartment_id==fa);if(t=='contracts'){if(fa)rows=rows.filter(r=>r.apartment_id==fa);if(FPER.f)rows=rows.filter(r=>!r.end_date||r.end_date>=FPER.f);if(FPER.t)rows=rows.filter(r=>r.start_date<=FPER.t)}if(t=='expenses'){if(fa)rows=rows.filter(r=>r.apartment_id==fa);const rk=r=>{if(!(r.amount>0))return 3;const q=SD.filter(s=>s.expense_id===r.id);return!q.length?1:sumk(q,'remaining')>0.004?0:2};rows=[...rows].sort((a,b)=>rk(a)-rk(b)||b.spent_on.localeCompare(a.spent_on)||b.id-a.id)}
 const X=t=='expenses'?[['Incasso',r=>{const x=inc(r);return x=='—'?'—':bdg(x,x.startsWith('Incassata'))},1]]:t=='rooms'?[['Stato '+st.curM,r=>RM[r.id].st],['Periodo',r=>RM[r.id].per]]:t=='tenants'?[['Contratto attivo',r=>{const d=today(),a=CT.some(c=>c.tenant_id===r.id&&c.start_date<=d&&(!c.end_date||c.end_date>=d));return bdg(a?'Sì':'No',a,!a)},1]]:[];
 for(const[,,ty]of F)if(ty?.startsWith('ref:')){const rt=ty.slice(4);ref[rt]=Object.fromEntries((await api(rt)).map(x=>[x.id,R[rt](x)]))}
 const ECOLS=t=='expenses'?[...F.map(f=>[f[0],f[1]]),['inc','Incasso']]:[];
 if(t=='expenses'&&SORT.expenses)rows=srt(rows,SORT.expenses,(r,k)=>{if(k=='inc'){if(!(r.amount>0))return 9e9;const q=SD.filter(s=>s.expense_id===r.id);return(!q.length?1:sumk(q,'remaining')>0.004?0:2)*1e7+sumk(q,'remaining')}
  const f=F.find(x=>x[0]==k);if(f?.[2]?.startsWith('ref:'))return ref[f[2].slice(4)][r[k]]??'';return r[k]??(f?.[2]=='number'?0:'')});
 const cell=(r,[k,,ty=''])=>ty.startsWith('ref:')?ref[ty.slice(4)][r[k]]??'':r[k]??'',
 cellH=(r,f)=>{const k=f[0];if(k=='apartment_id')return aptTag(ref.apartments?.[r.apartment_id],r.apartment_id);if(k=='tenant_id')return tnTag(ref.tenants?.[r.tenant_id]);if(t=='apartments'&&k=='name')return aptTag(r.name,r.id);if(t=='apartments'&&k=='color')return`<span class=sw style="background:${aptCol(r.id)}"></span>`;if(t=='tenants'&&(k=='first_name'||k=='last_name'))return tnTag(r[k]);if(f[2]=='date')return esc(fd(r[k]));return esc(cell(r,f))};
 $('#main').innerHTML=`<h2>${ti}</h2><button id=new>+ Nuovo</button> ${t=='expenses'||t=='rooms'||t=='contracts'?aptSel(AP,fa)+' ':''}${t=='contracts'?`<span class=fl>Attivi dal</span> <input type=date id=cf value="${FPER.f}"> <span class=fl>al</span> <input type=date id=ct value="${FPER.t}"> ${FPER.f||FPER.t?'<button type=button class=sec id=cclr>Azzera periodo</button> ':''}`:''}${t=='rooms'?`${mn('rmm',st.curM)} `:''}${t=='expenses'?sortBar('expenses',ECOLS):''}<input id=q placeholder="Cerca…"><div class=sc><table class=rt><tr>${F.map(f=>t=='expenses'?thS('expenses',f[0],esc(f[1])):`<th>${f[1]}`).join('')}${X.map(x=>t=='expenses'?thS('expenses','inc',esc(x[0])):`<th>${esc(x[0])}`).join('')}<th></tr>${rows.map((r,i)=>`<tr data-f data-i=${i}>${F.map(f=>`<td data-l="${esc(f[1])}">${cellH(r,f)}`).join('')}${X.map(x=>`<td data-l="${esc(x[0])}">${x[2]?x[1](r):esc(x[1](r))}`).join('')}<td class=act><button data-a=e>✎</button><button data-a=d>🗑</button>${t=='expenses'?`${r.amount>0?'<button data-a=r>Ripartisci</button><button data-a=i>Incassi</button>':''}<button data-a=f class="${DC[r.id]?'has':''}" title="Allegati">📎${DC[r.id]?' '+DC[r.id]:''}</button>`:''}</tr>`).join('')}</table></div>`;
 filt();const again=()=>list(t);if(t=='expenses')sortWire('expenses',again);if($('#fa'))$('#fa').onchange=e=>{FAP[t]=e.target.value;list(t)};if($('#rmm'))$('#rmm').onchange=e=>{st.curM=e.target.value||st.curM;list(t)};if($('#cf'))$('#cf').onchange=$('#ct').onchange=()=>{FPER.f=$('#cf').value;FPER.t=$('#ct').value;list(t)};if($('#cclr'))$('#cclr').onclick=()=>{FPER.f=FPER.t='';list(t)};$('#new').onclick=()=>form(t,F,t=='rooms'&&fa?{apartment_id:fa}:{},again);
 $('#main').querySelector('table').onclick=async e=>{const a=e.target.dataset.a,tr=e.target.closest('tr[data-i]');if(!a)return;const r=rows[tr.dataset.i];
  if(a=='e')form(t,F,r,again);
  if(a=='d'&&confirm('Eliminare definitivamente questo elemento?'))try{await api(t+'/'+r.id,{method:'DELETE'});again()}catch{}
  if(a=='r')alloc(r);
  if(a=='i')collectDlg(r.id,again);
  if(a=='f')attach(r,again)}}
