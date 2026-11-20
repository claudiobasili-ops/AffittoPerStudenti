// Menù Spese: ripartizione e incassi
import { api } from './api.js';
import { get } from './db.js';
import { split } from './rules.js';
import { aptSel, aptTag, bdg, tnTag } from './ui.js';
import { $, FAP, N, esc, eur, fd, sum0, sumk, today } from './util.js';
import { filt, form } from './views-entities.js';

export async function alloc(e){const d=$('#dlg'),T=await api(`expenses/${e.id}/tenants`);d.onclick=null;
 d.innerHTML=`<form method=dialog onsubmit="if(!event.submitter||event.submitter.value!='x')return false"><div class=fb><h3>Ripartizione ${eur(e.amount)}</h3><label>Criterio<select id=cr><option value=uguale>Parti uguali<option value=giorni>Giorni di permanenza<option value=percentuale>Percentuali (%)<option value=quota>Quote (€)<option value=mq>Metri quadri (mq)</select></label><div id=vals class=g></div><div id=res></div></div>
  <div class=ft><button type=button id=go>Calcola</button><button type=button id=sv hidden>Salva modifiche manuali</button><button value=x class=sec>Chiudi</button></div></form>`;d.showModal();
 const cr=$('#cr');cr.onchange=()=>$('#vals').innerHTML=cr.value=='mq'?'<p><small>Il peso di ogni inquilino è dato dai mq della sua camera divisi per le persone presenti nella stessa camera, giorno per giorno nel periodo di competenza.</small></p>':['percentuale','quota'].includes(cr.value)?T.map(t=>`<label>${esc(t.name)} (${t.days} gg)<input type=text inputmode=decimal data-t=${t.id}></label>`).join(''):'';
 $('#go').onclick=async()=>{const values={};document.querySelectorAll('#vals input').forEach(i=>values[i.dataset.t]=N(i.value));try{await api(`expenses/${e.id}/allocate`,{method:'POST',body:{criterion:cr.value,values}});shares(e)}catch{}};shares(e)}
async function shares(e){const a=await api(`expenses/${e.id}/allocation`),sv=$('#sv');if(!a){sv.hidden=true;return}
 $('#res').innerHTML=`<h4>Criterio: ${esc(a.criterion)}</h4><p><small>Modifica una quota: le altre si adeguano da sole per mantenere il totale.</small></p><div class=g>${a.shares.map(s=>`<label>${esc(s.tenant)} <small>${s.days??''} gg${s.modified?' · ✏️ calcolata '+(s.calc_cents/100).toFixed(2):''}</small><input type=text inputmode=decimal data-s=${s.id} data-w=${s.weight||0} value="${(s.final_cents/100).toFixed(2)}"></label>`).join('')}</div><p id=tot></p>`;
 const I=[...document.querySelectorAll('#res input')],tc=a.total_cents,cents=i=>Math.round(N(i.value)*100);
 const bal=()=>{const lk=I.filter(i=>i.dataset.k),fr=I.filter(i=>!i.dataset.k),rem=tc-sum0(lk.map(cents));
  if(fr.length&&rem>=0){const w=fr.map(i=>+i.dataset.w||0);split(rem,sum0(w)?w:fr.map(()=>1)).forEach((c,j)=>fr[j].value=(c/100).toFixed(2))}
  const df=tc-sum0(I.map(cents));$('#tot').innerHTML=df?`<b style="color:#b91c1c">Differenza da assegnare: ${eur(df/100)}</b>`:`<b style="color:#15803d">Totale quote: ${eur(tc/100)} ✓</b>`;sv.disabled=!!df};
 I.forEach(i=>i.oninput=()=>{i.dataset.k=1;if(I.every(x=>x.dataset.k))I.forEach(x=>{if(x!==i)delete x.dataset.k});bal()});bal();sv.hidden=false;
 sv.onclick=async()=>{try{await api(`allocations/${a.id}/shares`,{method:'PUT',body:{shares:I.map(i=>({id:i.dataset.s,final:N(i.value)}))}});await shares(e);const b=$('#sv');b.textContent='Salvato ✓';setTimeout(()=>b.textContent='Salva modifiche manuali',1500)}catch{}}}
export async function collectDlg(id,after){const d=$('#dlg'),L=await api(`expenses/${id}/collect`),e=await get('expenses',id);d.onclick=null;
 const tot=sumk(L,'final'),pd=sumk(L,'paid'),rem=Math.round((tot-pd)*100)/100;
 d.innerHTML=`<div class=fb><h3>Incasso spesa</h3><p><b>${esc(e.description||'Spesa')}</b> · ${eur(e.amount)} · ${fd(e.spent_on)}</p>${L.length?`<p>Quote ${eur(tot)} · Incassato ${eur(pd)} · <b>Da incassare ${eur(rem)}</b></p>
  ${L.map(s=>`<div class=card style="margin-bottom:8px;background:#f9fafb"><b style="font-size:16px">${tnTag(s.tenant)}</b>Quota ${eur(s.final)} · Incassato ${eur(s.paid)} · <strong>Residuo ${eur(s.remaining)}</strong> ${s.remaining<=0.004?'✓':''}
   ${s.payments.map(p=>`<div><small>${fd(p.paid_on)} · ${eur(p.amount)} · ${esc(p.method||'')} <button type=button class=sec data-x=${p.id} style="min-height:32px;padding:2px 8px">🗑</button></small></div>`).join('')}
   ${s.remaining>0.004?`<button type=button data-s=${s.id} data-r=${s.remaining}>Incassa</button>`:''}</div>`).join('')}`:'<p>Questa spesa non è ancora stata ripartita: usa prima “Ripartisci”.</p>'}</div><div class=ft><button class=sec id=cl>Chiudi</button></div>`;
 if(!d.open)d.showModal();$('#cl').onclick=()=>{d.close();after?.()};
 d.onclick=async ev=>{const x=ev.target.dataset.x,s=ev.target.dataset.s;
  if(x&&confirm('Eliminare questo incasso?'))try{await api('share_payments/'+x,{method:'DELETE'});collectDlg(id,after)}catch{}
  if(s)form('share_payments',[['paid_on','Data incasso','date'],['amount','Importo €','number'],['method','Modalità','sel:bonifico,contanti,carta,altro'],['notes','Note']],{share_id:s,amount:ev.target.dataset.r,paid_on:today()},()=>collectDlg(id,after))}}
async function sharesView(){const L0=await api('shares_due'),AP=await api('apartments'),fa=FAP.shares,L=fa?L0.filter(s=>s.apt==fa):L0,st=s=>s.remaining<=0.004?'Incassata':s.spent_on<today()?'IN RITARDO':s.paid>0?'Parziale':'Da incassare';
 L.sort((a,b)=>(b.remaining>0.004)-(a.remaining>0.004));
 $('#main').innerHTML=`<h2>Incassi spese</h2>${aptSel(AP,fa)} <input id=q placeholder="Cerca inquilino o spesa…"><p><b>Da incassare: ${eur(sumk(L,'remaining'))}</b></p><div class=sc><table class=rt><tr><th>Scadenza<th>Appartamento<th>Spesa<th>Inquilino<th>Quota<th>Incassato<th>Residuo<th>Stato<th></tr>
 ${L.map(s=>`<tr data-f data-e=${s.expense_id} class="${s.remaining>0.004&&s.spent_on<today()?'late':''}"><td data-l="Scadenza">${fd(s.spent_on)}<td data-l="Appartamento">${aptTag(s.apartment,s.apt)}<td data-l="Spesa">${esc(s.desc)}<td data-l="Inquilino">${tnTag(s.tenant)}<td data-l="Quota">${eur(s.final)}<td data-l="Incassato">${eur(s.paid)}<td data-l="Residuo">${eur(s.remaining)}<td data-l="Stato">${bdg(st(s),st(s)=='Incassata')}<td class=act><button>${s.remaining>0.004?'Incassa':'Dettaglio'}</button></tr>`).join('')}</table></div>
 ${L.length?'':'<p>Nessuna spesa ripartita: ripartisci una spesa dal menu Spese.</p>'}`;filt();$('#fa').onchange=e=>{FAP.shares=e.target.value;sharesView()};
 $('#main').querySelector('table').onclick=e=>{const tr=e.target.closest('tr[data-e]');if(tr&&e.target.tagName=='BUTTON')collectDlg(+tr.dataset.e,sharesView)}}
