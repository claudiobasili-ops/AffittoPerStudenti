// Menù Caparre
import { api } from './api.js';
import { aptSel, aptTag, bdg, tnTag } from './ui.js';
import { $, FAP, esc, eur, fd, sumk, today } from './util.js';
import { filt, form } from './views-entities.js';

async function depositDlg(id,after){const d=$('#dlg'),r=(await api('deposits')).find(x=>x.id===id);d.onclick=null;
 if(!r){d.close();return}
 d.innerHTML=`<div class=fb><h3>Caparra</h3><p>${tnTag(r.tenant)} · ${aptTag(r.apartment,r.apt)}<br><small>Contratto dal ${fd(r.start)} a ${r.end?fd(r.end):'in corso'}</small></p>
  <p>Caparra ${eur(r.deposit)} · Versata ${eur(r.paid)} · Restituita ${eur(r.returned)}<br><strong>In deposito ${eur(r.held)}</strong>${r.toPay>.004?' · Da versare '+eur(r.toPay):''} · ${bdg(r.status,r.status=='Versata'||r.status=='Restituita')}</p>
  <h4>Movimenti</h4>${r.moves.map(m=>`<div>${fd(m.moved_on)} · ${m.kind=='versamento'?'Versamento':'Restituzione'} ${eur(m.amount)} · ${esc(m.method||'')} <button type=button class=sec data-x=${m.id} style="min-height:32px;padding:2px 8px">🗑</button></div>`).join('')||'<p>Nessun movimento.</p>'}
  <div style="margin-top:10px">${r.toPay>.004?`<button type=button data-n=versamento data-a=${r.toPay}>Registra versamento</button>`:''}${r.held>.004?`<button type=button data-n=restituzione data-a=${r.held}>Registra restituzione</button>`:''}</div></div><div class=ft><button class=sec id=cl>Chiudi</button></div>`;
 if(!d.open)d.showModal();$('#cl').onclick=()=>{d.close();after?.()};
 d.onclick=async ev=>{const x=ev.target.dataset.x,n=ev.target.dataset.n;
  if(x&&confirm('Eliminare questo movimento?'))try{await api('deposit_moves/'+x,{method:'DELETE'});depositDlg(id,after)}catch{}
  if(n)form('deposit_moves',[['moved_on',n=='versamento'?'Data versamento':'Data restituzione','date'],['amount','Importo €','number'],['method','Modalità','sel:bonifico,contanti,carta,altro'],['notes','Note']],{contract_id:id,kind:n,amount:ev.target.dataset.a,moved_on:today()},()=>depositDlg(id,after))}}
export async function depositsView(){const D0=await api('deposits'),AP=await api('apartments'),fa=FAP.deposits,D=fa?D0.filter(d=>d.apt==fa):D0;
 $('#main').innerHTML=`<h2>Caparre</h2>${aptSel(AP,fa)} <input id=q placeholder="Cerca inquilino…"><div class=cards style="margin:10px 0"><div class=card>Caparre pattuite<b>${eur(sumk(D,'deposit'))}</b></div><div class=card>Da versare<b>${eur(sumk(D,'toPay'))}</b></div><div class=card>In deposito<b>${eur(sumk(D,'held'))}</b></div><div class=card>Da restituire (contratti conclusi)<b>${eur(sumk(D.filter(d=>d.status=='Da restituire'),'held'))}</b></div></div>
 <div class=sc><table class=rt><tr><th>Inquilino<th>Appartamento<th>Contratto<th>Caparra<th>Versata<th>Restituita<th>In deposito<th>Stato<th></tr>
 ${D.map(r=>`<tr data-f data-c=${r.id} class="${r.status=='Da restituire'?'late':''}"><td data-l="Inquilino">${tnTag(r.tenant)}<td data-l="Appartamento">${aptTag(r.apartment,r.apt)}<td data-l="Contratto">${fd(r.start)} – ${r.end?fd(r.end):'in corso'}<td data-l="Caparra">${eur(r.deposit)}<td data-l="Versata">${eur(r.paid)}<td data-l="Restituita">${eur(r.returned)}<td data-l="In deposito">${eur(r.held)}<td data-l="Stato">${bdg(r.status,r.status=='Versata'||r.status=='Restituita')}<td class=act><button>Gestisci</button></tr>`).join('')}</table></div>
 ${D.length?'':'<p>Nessuna caparra: inserisci l\'importo nel campo “Caparra €” del contratto.</p>'}`;filt();
 $('#fa').onchange=e=>{FAP.deposits=e.target.value;depositsView()};
 $('#main').querySelector('table').onclick=e=>{const tr=e.target.closest('tr[data-c]');if(tr&&e.target.tagName=='BUTTON')depositDlg(+tr.dataset.c,depositsView)}}
