// Menù Dashboard
import { api } from './api.js';
import { lastExp, needBackup } from './backup.js';
import { cloudLine } from './cloud-sync.js';
import { gm } from './db.js';
import { st } from './state.js';
import { aptTag, mn, tnTag } from './ui.js';
import { $, APP_VERSION, esc, eur, fd, fdt, fm, today } from './util.js';
import { expDonut, perApt, rentDonut, totCard } from './views-charts.js';
import { collectDlg } from './views-expenses.js';

export async function dash(m){m=m||st.curM;st.curM=m;const[D,V2,lm,le,lr,rf]=await Promise.all([api('dashboard?month='+m),api('dues'),gm('lastModified'),lastExp(),gm('lastRestore'),gm('restoredFrom')]),ref=[le,rf].filter(Boolean).sort().pop(),need=await needBackup(lm,ref),cl=await cloudLine(),sum=k=>D.per.reduce((a,x)=>a+ +x[k],0),late=V2.filter(d=>d.late),lateS=D.shareList.filter(s=>s.spent_on<today()),
  // Spese da incassare: solo le quote con scadenza entro la fine del mese scelto (comprese quelle scadute nei mesi precedenti)
  mEnd=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).toISOString().slice(0,10),shD=D.shareList.filter(s=>s.spent_on<=mEnd),shF=D.shareList.length-shD.length;
 $('#main').innerHTML=`<h2>Dashboard</h2><div class=ver>Versione ${APP_VERSION}</div>${mn('dm',m)}<div class=cards style="margin-top:10px"><div class=card>Appartamenti<b>${D.k.apartments}</b></div><div class=card>Inquilini attivi<b>${D.k.tenants}</b></div></div>
 <div class=two><div><h4 class=colh>Canoni</h4><div class=card>Affitti previsti<b>${eur(sum('expected'))}</b></div><div class=card>Incassati<b>${eur(sum('collected'))}</b></div><div class=card>Da incassare<b>${eur(sum('expected')-sum('collected'))}</b></div>${rentDonut(D)}</div>
 <div><h4 class=colh>Spese</h4><div class=card>Spese del mese<b>${eur(sum('expenses'))}</b></div><div class=card>Spese locatore (pagate)<b>${eur(sum('landlord'))}</b></div><div class=card>Spese da incassare (mese)<b>${eur(D.expMonthDue)}</b></div>${expDonut(D)}</div></div>
 ${totCard(D)}
 ${D.unallocated?`<p class=card style="margin-top:10px">Ci sono <b>${D.unallocated}</b> spese non ancora ripartite: non compaiono tra le spese da incassare finché non le ripartisci.</p>`:''}
 ${D.k.tenants&&!sum('expected')?'<p class=card>Nessun canone generato per questo mese: vai in <b>Canoni</b> e premi “Genera canoni del mese”.</p>':''}<details data-k=apt ${st.DCOLL.apt?'':'open'}><summary><h3>Per appartamento</h3></summary>${perApt(D)}
 </details><details data-k=late ${st.DCOLL.late?'':'open'}><summary><h3>Pagamenti in ritardo (${late.length+lateS.length})</h3></summary><div class=sc><table class=rt>${(late.map(d=>`<tr class=late><td data-l="Mese">${fm(d.month)}<td data-l="Appartamento">${aptTag(d.apartment,d.apt)}<td data-l="Inquilino">${tnTag(d.tenant)}<td data-l="Residuo">${eur(d.remaining)}</tr>`).join('')+lateS.map(s=>`<tr class=late><td data-l="Spesa">${esc(s.desc)} · scad. ${fd(s.spent_on)}<td data-l="Appartamento">${aptTag(s.apartment,s.apt)}<td data-l="Inquilino">${tnTag(s.tenant)}<td data-l="Residuo">${eur(s.remaining)}</tr>`).join(''))||'<tr><td>Nessun ritardo</tr>'}</table></div>
 </details><details data-k=sp ${st.DCOLL.sp?'':'open'}><summary><h3>Spese da incassare entro il ${fd(mEnd)} (${shD.length})</h3></summary><div class=sc><table class=rt>${shD.map(s=>`<tr class="${s.spent_on<today()?'late':''}"><td data-l="Scadenza">${fd(s.spent_on)}<td data-l="Appartamento">${aptTag(s.apartment,s.apt)}<td data-l="Spesa">${esc(s.desc)}<td data-l="Inquilino">${tnTag(s.tenant)}<td data-l="Residuo">${eur(s.remaining)}<td class=act><button data-e=${s.expense_id}>Incassa</button></tr>`).join('')||'<tr><td>Nessuna spesa da incassare</tr>'}</table></div>${shF?`<p class=mut style="margin:6px 0 0"><small>${shF==1?'Un’altra quota':'Altre '+shF+' quote'} con scadenza successiva al ${fd(mEnd)}: scegli un mese successivo per veder${shF==1?'la':'le'}.</small></p>`:''}</details>
 <div class=meta>${need?'<div style="color:#b91c1c;font-size:15px;margin:0 0 6px"><b>⚠ Effettua un backup: ci sono modifiche successive all’ultimo backup.</b></div>':''}<div>Ultima modifica ai dati: <b>${fdt(lm)||'—'}</b></div><div>Ultimo backup caricato (ripristinato): <b>${lr?fdt(lr)+(rf?' · backup creato il '+fdt(rf):''):'—'}</b></div><div>Ultimo backup esportato: <b>${fdt(le)||'—'}</b></div><div>Sincronizzazione cloud: <b id=cloudline>${esc(cl)}</b></div></div>`;
 document.querySelectorAll('#main details[data-k]').forEach(x=>x.ontoggle=()=>{st.DCOLL[x.dataset.k]=!x.open;try{localStorage.dashColl=JSON.stringify(st.DCOLL)}catch{}});$('#dm').onchange=e=>dash(e.target.value);$('#main').onclick=e=>{const x=e.target.dataset.e;if(x)collectDlg(+x,()=>dash(m))}}
