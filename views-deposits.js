// Menù Caparre
import { api } from './api.js';
import { SORT, st } from './state.js';
import { aptSel, aptTag, bdg, sortBar, sortWire, srt, thS, tnTag } from './ui.js';
import { $, FAP, esc, eur, fd, sumk, today } from './util.js';
import { filt, form } from './views-entities.js';

const OK=['Versata','Restituita','Trasferita','Da trasferimento'];
const mvLbl=(m,cl)=>m.incoming?'Ricevuta da trasferimento (contratto '+cl(m.from_contract_id)+')':m.kind=='versamento'?'Versamento':m.kind=='trasferimento'?'Trasferita al contratto '+cl(m.to_contract_id):'Restituzione';
async function depositDlg(id,after){const d=$('#dlg'),DR=await api('deposits'),r=DR.find(x=>x.id===id),CT=await api('contracts'),cl=cid=>{const c=CT.find(x=>x.id===cid);return c?fd(c.start_date)+' – '+(c.end_date?fd(c.end_date):'in corso'):'—'},opts=r?CT.filter(c=>c.tenant_id===r.tenant_id&&c.id!==id&&c.start_date>r.start).sort((a,b)=>a.start_date.localeCompare(b.start_date)):[];d.onclick=null;
 if(!r){d.close();return}
 d.innerHTML=`<div class=fb><h3>Caparra</h3><p>${tnTag(r.tenant)} · ${aptTag(r.apartment,r.apt)}<br><small>Contratto dal ${fd(r.start)} a ${r.end?fd(r.end):'in corso'}</small></p>
  <p>Caparra ${eur(r.deposit)} · Versata ${eur(r.paid)} · Restituita ${eur(r.returned)}<br><strong>In deposito ${eur(r.held)}</strong>${r.toPay>.004?' · Da versare '+eur(r.toPay):''} · ${bdg(r.status,OK.includes(r.status))}${r.transferred>.004?'<br>Trasferita ad altro contratto '+eur(r.transferred):''}${r.incoming>.004?'<br>Ricevuta da trasferimento '+eur(r.incoming):''}</p>
  <h4>Movimenti</h4>${r.moves.map(m=>`<div>${fd(m.moved_on)} · ${mvLbl(m,cl)} ${eur(m.amount)} · ${esc(m.method||'')} <button type=button class=sec data-x=${m.id} style="min-height:32px;padding:2px 8px">🗑</button></div>`).join('')||'<p>Nessun movimento.</p>'}
  <div style="margin-top:10px">${r.toPay>.004?`<button type=button data-n=versamento data-a=${r.toPay}>Registra versamento</button>`:''}${r.held>.004?`<button type=button data-n=restituzione data-a=${r.held}>Registra restituzione</button>`:''}${r.held>.004&&opts.length?`<button type=button data-n=trasferimento data-a=${r.held}>Registra trasferimento</button>`:''}</div></div><div class=ft><button class=sec id=cl>Chiudi</button></div>`;
 if(!d.open)d.showModal();$('#cl').onclick=()=>{d.close();after?.()};
 d.onclick=async ev=>{const x=ev.target.dataset.x,n=ev.target.dataset.n;
  if(x&&confirm('Eliminare questo movimento?'))try{await api('deposit_moves/'+x,{method:'DELETE'});depositDlg(id,after)}catch{}
  if(n=='trasferimento')form('deposit_moves',[['moved_on','Data trasferimento','date'],['to_contract_id','Nuovo contratto (stesso inquilino)',opts.map(c=>[c.id,cl(c.id)])],['amount','Importo €','number'],['notes','Note']],{contract_id:id,kind:n,amount:ev.target.dataset.a,moved_on:today(),to_contract_id:opts[0].id},()=>depositDlg(id,after));
  else if(n)form('deposit_moves',[['moved_on',n=='versamento'?'Data versamento':'Data restituzione','date'],['amount','Importo €','number'],['method','Modalità','sel:bonifico,contanti,carta,altro'],['notes','Note']],{contract_id:id,kind:n,amount:ev.target.dataset.a,moved_on:today()},()=>depositDlg(id,after))}}
const RK={'Da restituire':0,'Da versare':1,'Versata in parte':2,'Versata':3,'Da trasferimento':4,'Restituita in parte':5,'Trasferita in parte':6,'Restituita':7,'Trasferita':8};
const DCOLS=[['tenant','Inquilino'],['apartment','Appartamento'],['start','Contratto'],['deposit','Caparra'],['paid','Versata'],['returned','Restituita'],['held','In deposito'],['status','Stato']];
// Contratto non ancora concluso (in corso o futuro) oppure concluso con caparra da restituire
const actOrDue=d=>!d.end||d.end>=today()||d.status=='Da restituire';
export async function depositsView(){const D0=await api('deposits'),AP=await api('apartments'),fa=FAP.deposits,D=srt((fa?D0.filter(d=>d.apt==fa):D0).filter(d=>!st.DACT||actOrDue(d)),SORT.deposits,(d,k)=>k=='status'?RK[d.status]??99:d[k]??'');
 $('#main').innerHTML=`<h2>Caparre</h2>${aptSel(AP,fa)} <label class="ck inl"><input type=checkbox id=dact${st.DACT?' checked':''}>Solo contratti attivi e conclusi da restituire</label> ${sortBar('deposits',DCOLS)}<input id=q placeholder="Cerca inquilino…"><div class=cards style="margin:10px 0"><div class=card>Da versare<b>${eur(sumk(D,'toPay'))}</b></div><div class=card>In deposito<b>${eur(sumk(D,'held'))}</b></div><div class=card>Da restituire (contratti conclusi)<b>${eur(sumk(D.filter(d=>d.status=='Da restituire'),'held'))}</b></div></div>
 <div class=sc><table class=rt><tr>${DCOLS.map(([k,l])=>thS('deposits',k,l)).join('')}<th></tr>
 ${D.map(r=>`<tr data-f data-c=${r.id} class="${r.status=='Da restituire'?'late':''}"><td data-l="Inquilino">${tnTag(r.tenant)}<td data-l="Appartamento">${aptTag(r.apartment,r.apt)}<td data-l="Contratto">${fd(r.start)} – ${r.end?fd(r.end):'in corso'}<td data-l="Caparra">${eur(r.deposit)}<td data-l="Versata">${eur(r.paid)}<td data-l="Restituita">${eur(r.returned)}<td data-l="In deposito">${eur(r.held)}<td data-l="Stato">${bdg(r.status,OK.includes(r.status))}<td class=act><button>Gestisci</button></tr>`).join('')}</table></div>
 ${D.length?'':D0.length?'<p>Nessuna caparra con i filtri scelti.</p>':'<p>Nessuna caparra: inserisci l\'importo nel campo “Caparra €” del contratto.</p>'}`;filt();sortWire('deposits',depositsView);
 $('#fa').onchange=e=>{FAP.deposits=e.target.value;depositsView()};$('#dact').onchange=e=>{st.DACT=e.target.checked;depositsView()};
 $('#main').querySelector('table').onclick=e=>{const tr=e.target.closest('tr[data-c]');if(tr&&e.target.tagName=='BUTTON')depositDlg(+tr.dataset.c,depositsView)}}
