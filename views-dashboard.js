// Menù Dashboard
import { api } from './api.js';
import { lastExp, needBackup } from './backup.js';
import { cloudLine } from './cloud-sync.js';
import { gm } from './db.js';
import { st } from './state.js';
import { aptTag, mn, tnTag } from './ui.js';
import { $, APP_VERSION, addD, esc, eur, fd, fdt, fm, today } from './util.js';
import { expDonut, perApt, rentDonut, totCard } from './views-charts.js';
import { collectDlg } from './views-expenses.js';
import { depositDlg } from './views-deposits.js';
import { renew } from './views-entities.js';
import { localReport } from './views-report.js';

export async function dash(m){m=m||st.curM;st.curM=m;const[D,V2,lm,le,lr,rf,CT,DR,TE,AP]=await Promise.all([api('dashboard?month='+m),api('dues'),gm('lastModified'),lastExp(),gm('lastRestore'),gm('restoredFrom'),api('contracts'),api('deposits'),api('tenants'),api('apartments')]),ref=[le,rf].filter(Boolean).sort().pop(),need=await needBackup(lm,ref),cl=await cloudLine(),sum=k=>D.per.reduce((a,x)=>a+ +x[k],0),late=V2.filter(d=>d.late),lateS=D.shareList.filter(s=>s.spent_on<today()),
  // Spese da incassare: solo le quote con scadenza entro la fine del mese scelto (comprese quelle scadute nei mesi precedenti)
  mEnd=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).toISOString().slice(0,10),shD=D.shareList.filter(s=>s.spent_on<=mEnd),shF=D.shareList.length-shD.length;
 $('#main').innerHTML=`<h2>Dashboard</h2><div class=ver>Versione ${APP_VERSION}</div>${mn('dm',m)}<div class=cards style="margin-top:10px"><div class=card>Appartamenti<b>${D.k.apartments}</b></div><div class=card>Inquilini attivi<b>${D.k.tenants}</b></div></div>
 <div class=two><div><h4 class=colh>Canoni</h4><div class=card>Affitti previsti<b>${eur(sum('expected'))}</b></div><div class=card>Incassati<b>${eur(sum('collected'))}</b></div><div class=card>Da incassare<b>${eur(sum('expected')-sum('collected'))}</b></div>${rentDonut(D)}</div>
 <div><h4 class=colh>Spese</h4><div class=card>Spese del mese<b>${eur(sum('expenses'))}</b></div><div class=card>Spese locatore (pagate)<b>${eur(sum('landlord'))}</b></div><div class=card>Spese da incassare (mese)<b>${eur(D.expMonthDue)}</b></div>${expDonut(D)}</div></div>
 ${totCard(D)}
 ${D.unallocated?`<p class=card style="margin-top:10px">Ci sono <b>${D.unallocated}</b> spese non ancora ripartite: non compaiono tra le spese da incassare finché non le ripartisci.</p>`:''}
 ${D.k.tenants&&!sum('expected')?'<p class=card>Nessun canone generato per questo mese: vai in <b>Canoni</b> e premi “Genera canoni del mese”.</p>':''}${scad(CT,DR,TE,AP)}<details data-k=apt ${st.DCOLL.apt?'':'open'}><summary><h3>Per appartamento</h3></summary>${perApt(D)}
 </details><details data-k=late ${st.DCOLL.late?'':'open'}><summary><h3>Pagamenti in ritardo (${late.length+lateS.length})</h3></summary><div class=sc><table class=rt>${(late.map(d=>`<tr class=late><td data-l="Mese">${fm(d.month)}<td data-l="Appartamento">${aptTag(d.apartment,d.apt)}<td data-l="Inquilino">${tnTag(d.tenant)}<td data-l="Residuo">${eur(d.remaining)}<td class=act><button class=sec data-sol=${d.tenant_id}>Sollecita</button></tr>`).join('')+lateS.map(s=>`<tr class=late><td data-l="Spesa">${esc(s.desc)} · scad. ${fd(s.spent_on)}<td data-l="Appartamento">${aptTag(s.apartment,s.apt)}<td data-l="Inquilino">${tnTag(s.tenant)}<td data-l="Residuo">${eur(s.remaining)}<td class=act><button class=sec data-sol=${s.tenant_id}>Sollecita</button></tr>`).join(''))||'<tr><td>Nessun ritardo</tr>'}</table></div>
 </details><details data-k=sp ${st.DCOLL.sp?'':'open'}><summary><h3>Spese da incassare entro il ${fd(mEnd)} (${shD.length})</h3></summary><div class=sc><table class=rt>${shD.map(s=>`<tr class="${s.spent_on<today()?'late':''}"><td data-l="Scadenza">${fd(s.spent_on)}<td data-l="Appartamento">${aptTag(s.apartment,s.apt)}<td data-l="Spesa">${esc(s.desc)}<td data-l="Inquilino">${tnTag(s.tenant)}<td data-l="Residuo">${eur(s.remaining)}<td class=act><button data-e=${s.expense_id}>Incassa</button></tr>`).join('')||'<tr><td>Nessuna spesa da incassare</tr>'}</table></div>${shF?`<p class=mut style="margin:6px 0 0"><small>${shF==1?'Un’altra quota':'Altre '+shF+' quote'} con scadenza successiva al ${fd(mEnd)}: scegli un mese successivo per veder${shF==1?'la':'le'}.</small></p>`:''}</details>
 <div class=meta>${need?'<div style="color:#b91c1c;font-size:15px;margin:0 0 6px"><b>⚠ Effettua un backup: ci sono modifiche successive all’ultimo backup.</b></div>':''}<div>Ultima modifica ai dati: <b>${fdt(lm)||'—'}</b></div><div>Ultimo backup caricato (ripristinato): <b>${lr?fdt(lr)+(rf?' · backup creato il '+fdt(rf):''):'—'}</b></div><div>Ultimo backup esportato: <b>${fdt(le)||'—'}</b></div><div>Sincronizzazione cloud: <b id=cloudline>${esc(cl)}</b></div></div>`;
 document.querySelectorAll('#main details[data-k]').forEach(x=>x.ontoggle=()=>{st.DCOLL[x.dataset.k]=!x.open;try{localStorage.dashColl=JSON.stringify(st.DCOLL)}catch{}});$('#dm').onchange=e=>dash(e.target.value);$('#main').onclick=e=>{const x=e.target.dataset.e,ds=e.target.dataset;if(x)collectDlg(+x,()=>dash(m));if(ds.sol)sollecita(+ds.sol);
  if(ds.rn){const c=CT.find(c=>c.id==ds.rn);if(c)renew(c,()=>dash(m))}if(ds.dep)depositDlg(+ds.dep,()=>dash(m))}}
// Sollecito: report dei ritardi ad oggi del solo inquilino, con il pulsante «Invia su WhatsApp»
export function sollecita(tid){const t=today();localReport('pdf',{apartment:'',tenant:String(tid),from:t,to:t,spese:true,locatore:false,canoni:true,late:true})}
// In scadenza: contratti che finiscono entro 60 giorni (con Rinnova) e caparre da restituire (con Gestisci)
function scad(CT,DR,TE,AP){const t0=today(),lim=addD(t0,60),own=new Set(AP.filter(a=>!+a.prospect).map(a=>a.id)),tn=id=>{const t=TE.find(x=>x.id===id);return t?t.first_name+' '+t.last_name:''},an=id=>AP.find(a=>a.id===id)?.name||'',
 ex=CT.filter(c=>own.has(c.apartment_id)&&c.end_date&&c.end_date>=t0&&c.end_date<=lim).sort((a,b)=>a.end_date.localeCompare(b.end_date)),dep=DR.filter(d=>d.status=='Da restituire'),
 gg=d=>{const n=Math.round((Date.parse(d)-Date.parse(t0))/864e5);return n==0?'oggi':n==1?'domani':'tra '+n+' giorni'};
 return`<details data-k=scad ${st.DCOLL.scad?'':'open'}><summary><h3>In scadenza (${ex.length+dep.length})</h3></summary>
 <h4 class=colh style="margin-top:4px">Contratti che scadono entro il ${fd(lim)}</h4><div class=sc><table class=rt>${ex.map(c=>{const ren=CT.some(x=>x.tenant_id===c.tenant_id&&x.start_date>c.end_date);return`<tr><td data-l="Uscita">${fd(c.end_date)} <small class=mut>(${gg(c.end_date)})</small><td data-l="Inquilino">${tnTag(tn(c.tenant_id))}<td data-l="Appartamento">${aptTag(an(c.apartment_id),c.apartment_id)}<td data-l="Canone">${eur(c.monthly_rent)}<td class=act>${ren?'<span class="bdg ok">Già rinnovato</span>':`<button data-rn=${c.id}>Rinnova</button>`}</tr>`}).join('')||'<tr><td>Nessun contratto in scadenza nei prossimi 60 giorni</tr>'}</table></div>
 <h4 class=colh style="margin-top:10px">Caparre da restituire</h4><div class=sc><table class=rt>${dep.map(d=>`<tr class=late><td data-l="Contratto">${fd(d.start)} – ${fd(d.end)}<td data-l="Inquilino">${tnTag(d.tenant)}<td data-l="Appartamento">${aptTag(d.apartment,d.apt)}<td data-l="In deposito">${eur(d.held)}<td class=act><button data-dep=${d.id}>Gestisci</button></tr>`).join('')||'<tr><td>Nessuna caparra da restituire</tr>'}</table></div></details>`}
