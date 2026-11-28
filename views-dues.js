// Menù Canoni
import { api } from './api.js';
import { SORT, st } from './state.js';
import { aptSel, aptTag, bdg, mn, sortBar, sortWire, srt, thS, tnTag } from './ui.js';
import { $, FAP, esc, eur, fd, fm, thisM } from './util.js';
import { filt, form, totRow } from './views-entities.js';
import { sollecita } from './views-dashboard.js';

export async function dues(m){if(m===undefined)m=st.DM===undefined?thisM():st.DM;st.DM=m;const D0=await api('dues'+(m?'?month='+m:'')),AP=await api('apartments'),fa=FAP.dues,D=srt((fa?D0.filter(d=>d.apt==fa):D0).slice().sort((a,b)=>a.apartment.localeCompare(b.apartment)||(b.remaining>0)-(a.remaining>0)||b.month.localeCompare(a.month)||a.tenant.localeCompare(b.tenant)),SORT.dues,(d,k)=>k=='month'?d.month:k=='due_on'?d.due_on:k=='apartment'?d.apartment:k=='tenant'?d.tenant:k=='amount'?+d.amount:k=='paid'?+d.paid:k=='remaining'?+d.remaining:(+d.remaining<=0?0:d.late?3:+d.paid>0?1:2)),
 DCOLS=[['month','Mese'],['due_on','Scadenza'],['apartment','Appartamento'],['tenant','Inquilino'],['amount','Dovuto'],['paid','Incassato'],['remaining','Residuo'],['status','Stato']];
 $('#main').innerHTML=`<h2>Canoni</h2>${mn('mm',m)} <button type=button class=sec id=mall${m?'':' disabled'}>Tutti i mesi</button> ${aptSel(AP,fa)} <button id=gen>Genera canoni del mese</button> ${sortBar('dues',DCOLS)}<input id=q placeholder="Cerca inquilino…"><div class=sc><table class=rt><tr>${DCOLS.map(([k,l])=>thS('dues',k,l)).join('')}<th></tr>
 ${D.map(d=>`<tr data-f class="${d.late?'late':''}"><td data-l="Mese">${fm(d.month)}<td data-l="Scadenza">${fd(d.due_on)}<td data-l="Appartamento">${aptTag(d.apartment,d.apt)}<td data-l="Inquilino">${tnTag(d.tenant)}<td data-l="Dovuto" data-k=amount data-v="${+d.amount||0}">${eur(d.amount)}<td data-l="Incassato" data-k=paid data-v="${+d.paid||0}">${eur(d.paid)}<td data-l="Residuo" data-k=remaining data-v="${+d.remaining||0}">${eur(d.remaining)}<td data-l="Stato">${+d.remaining<=0?bdg('Incassato',1):bdg(d.late?'IN RITARDO':+d.paid>0?'Parziale':'Da pagare')}<td class=act>${+d.remaining>0?`<button data-p=${d.id} data-r=${d.remaining}>Incassa</button>`:''}${d.late?`<button class=sec data-sol=${d.tenant_id}>Sollecita</button>`:''}<button class=sec data-h=${d.id}>Pagamenti</button></tr>`).join('')}${totRow([1,null,null,null,['amount','Dovuto'],['paid','Incassato'],['remaining','Residuo'],null,null])}</table></div>
 <p><small>${m?'Premi «Tutti i mesi» per vedere tutto lo storico.':'Stai vedendo tutti i mesi: scegli un mese per filtrare.'}</small></p>`;filt();sortWire('dues',()=>dues(m));
 $('#mm').onchange=e=>dues(e.target.value);$('#fa').onchange=e=>{FAP.dues=e.target.value;dues(m)};
 $('#mall').onclick=()=>dues('');$('#gen').onclick=async()=>{if(!$('#mm').value)return alert('Scegli un mese per generare i canoni');try{const r=await api('dues/generate',{method:'POST',body:{month:$('#mm').value}});alert(r.created+' canoni creati');dues($('#mm').value)}catch{}};
 $('#main').querySelector('table').onclick=e=>{const id=e.target.dataset.p;
  if(id)form('payments',[['paid_on','Data pagamento','date'],['amount','Importo €','number'],['method','Modalità','sel:bonifico,contanti,carta,altro'],['notes','Note']],{due_id:id,amount:e.target.dataset.r,paid_on:new Date().toISOString().slice(0,10)},()=>dues(m));
  if(e.target.dataset.h)payDlg(e.target.dataset.h,m);if(e.target.dataset.sol)sollecita(+e.target.dataset.sol)}}
async function payDlg(id,m){const L=(await api('payments')).filter(p=>p.due_id==id),d=$('#dlg');
 d.innerHTML=`<div class=fb><h3>Pagamenti registrati</h3>${L.map(p=>`<p>${fd(p.paid_on)} · ${eur(p.amount)} · ${esc(p.method||'')} <button type=button class=sec data-x=${p.id}>🗑 Elimina</button></p>`).join('')||'<p>Nessun pagamento.</p>'}</div><div class=ft><button class=sec id=dd>Elimina canone</button><button id=cl>Chiudi</button></div>`;d.showModal();
 d.onclick=async e=>{const x=e.target.dataset.x;if(x&&confirm('Eliminare questo pagamento?'))try{await api('payments/'+x,{method:'DELETE'});d.close();dues(m)}catch{}};
 $('#cl').onclick=()=>d.close();$('#dd').onclick=async()=>{if(confirm('Eliminare il canone e i suoi pagamenti?'))try{await api('rent_dues/'+id,{method:'DELETE'});d.close();dues(m)}catch{}}}
