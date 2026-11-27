// Menù Report e PDF
import { api } from './api.js';
import { all } from './db.js';
import { pdfDoc } from './lib-pdf.js';
import { R } from './schema.js';
import { st } from './state.js';
import { aptCol, aptTag, fileDlg, tnTag } from './ui.js';
import { $, esc, eur, fd, fm, sum0, today } from './util.js';

export function savePdf(){const R=st.LASTREP;fileDlg(R.name,pdfDoc(R.blocks,R.title),'Report PDF',()=>localReport('pdf',R.p))}
async function localReport(kind,p){try{const t0=today();if(p.late){p.locatore=false;if(!p.spese&&!p.canoni)throw'Per i ritardi seleziona Spese inquilini e/o Canoni (le spese locatore non hanno ritardi)'}
 if(!p.spese&&!p.locatore&&!p.canoni)throw'Seleziona almeno una voce: Spese inquilini, Spese locatore e/o Canoni';
 const[Ap,te,Co]=await Promise.all(['apartments','tenants','contracts'].map(all)),ap=p.apartment?Ap.find(a=>a.id==p.apartment):null;if(p.apartment&&!ap)throw'Appartamento non trovato';
 const an=id=>Ap.find(a=>a.id===id)?.name||'',atg=n=>aptTag(n,Ap.find(x=>x.name===n)?.id),tn=id=>{const t=te.find(x=>x.id===id);return t?t.first_name+' '+t.last_name:''},cmp=(x,y)=>String(x).localeCompare(String(y),'it'),f2=c=>(c/100).toFixed(2),
 multi=[p.spese,p.locatore,p.canoni].filter(Boolean).length>1,
 tap=p.tenant?new Set(Co.filter(c=>c.tenant_id==p.tenant).map(c=>c.apartment_id)):null,okA=id=>(!ap||id===ap.id)&&(!tap||tap.has(id)),
 ah=ap?'':'<th>Appartamento',ac=a=>ap?'':'<td>'+atg(a);let ex=[],exL=[],sh=[],als=[],cn=[];
 if(p.spese||p.locatore){const EXa=(await all('expenses')).filter(e=>okA(e.apartment_id)&&(p.late?e.spent_on<t0:e.spent_on>=p.from&&e.spent_on<=p.to)),ty=await all('expense_types'),bs=(x,y)=>cmp(x.apt,y.apt)||x.spent_on.localeCompare(y.spent_on);
  EXa.forEach(e=>{e.apt=an(e.apartment_id);e.type=ty.find(t=>t.id===e.type_id)?.name||''});
  ex=p.spese?EXa.filter(e=>e.amount>0).sort(bs):[];exL=p.locatore?EXa.filter(e=>(+e.landlord_amount||0)>0).sort(bs):[];
  if(p.spese){const shs=await all('allocation_shares'),sp=await all('share_payments');als=await all('allocations');
   for(const e of ex){const al=als.find(x=>x.expense_id===e.id);
    if(al)for(const s of shs.filter(s=>s.allocation_id===al.id))sh.push({...s,expense_id:e.id,apt:e.apt,spent_on:e.spent_on,pf:e.period_from,pt:e.period_to,type:e.type,desc:e.description,criterion:al.criterion,tenant:tn(s.tenant_id),paid:sum0(sp.filter(q=>q.share_id===s.id).map(q=>Math.round(q.amount*100)))})}
   if(p.tenant)sh=sh.filter(s=>s.tenant_id==p.tenant);
   // ritardi: solo le quote con scadenza passata ancora da versare, e le spese che ne hanno almeno una
   if(p.late){sh=sh.filter(s=>s.final_cents-s.paid>0);ex=ex.filter(e=>sh.some(s=>s.expense_id===e.id))}}}
 if(p.canoni){const[Du,Pa]=await Promise.all(['rent_dues','payments'].map(all)),m0=p.from.slice(0,7),m1=p.to.slice(0,7);
  cn=Du.map(d=>{const c=Co.find(x=>x.id===d.contract_id),mo=d.month.slice(0,7);if(!c||!okA(c.apartment_id)||(p.tenant&&c.tenant_id!=p.tenant)||(!p.late&&(mo<m0||mo>m1)))return null;
   const pp=Pa.filter(q=>q.due_id===d.id);
   return{apt:an(c.apartment_id),month:mo,scad:mo+'-'+String(c.due_day||5).padStart(2,'0'),tenant:tn(c.tenant_id),due:Math.round(d.amount*100),paid:sum0(pp.map(q=>Math.round(q.amount*100))),last:pp.map(q=>q.paid_on).sort().pop()||''}}).filter(Boolean).sort((x,y)=>cmp(x.apt,y.apt)||cmp(x.tenant,y.tenant)||x.month.localeCompare(y.month));
  if(p.late)cn=cn.filter(c=>c.due-c.paid>0&&c.scad<t0)}   // ritardi: non pagati del tutto e con il giorno di scadenza passato
 const fname=(p.late?'ritardi-':'')+(p.spese?'spese':'')+(p.locatore?(p.spese?'-':'')+'spese-locatore':'')+(p.canoni?(p.spese||p.locatore?'-':'')+'canoni':'');
 if(kind=='csv'){const rows=[],sec=t=>{if(multi){if(rows.length)rows.push([]);rows.push([t])}};
  if(p.spese){sec(p.locatore?'SPESE INQUILINI':'SPESE');rows.push(['Appartamento','Inquilino','Scadenza','Tipo','Descrizione','Importo','Criterio','Quota','Versato','Da versare','Competenza dal','Competenza al']);const L=[];
   for(const e of ex){const l=sh.filter(x=>x.expense_id===e.id);if(!l.length&&!p.tenant)L.push([e.apt,'',e.spent_on,e.type,e.description,e.amount,'','','','',fd(e.period_from),fd(e.period_to)]);else l.forEach(x=>L.push([e.apt,x.tenant,e.spent_on,e.type,e.description,e.amount,x.criterion,(x.final_cents/100).toFixed(2),(x.paid/100).toFixed(2),((x.final_cents-x.paid)/100).toFixed(2),fd(e.period_from),fd(e.period_to)]))}
   L.sort((x,y)=>cmp(x[0],y[0])||cmp(x[1],y[1])||cmp(x[2],y[2]));L.forEach(r=>{r[2]=fd(r[2]);rows.push(r)})}
  if(p.locatore){sec('SPESE LOCATORE');rows.push(['Appartamento','Scadenza','Tipo','Descrizione','Importo','Competenza dal','Competenza al']);exL.forEach(e=>rows.push([e.apt,fd(e.spent_on),e.type,e.description,f2(Math.round(e.landlord_amount*100)),fd(e.period_from),fd(e.period_to)]))}
  if(p.canoni){sec('CANONI');rows.push(['Appartamento','Inquilino','Mese','Scadenza','Dovuto','Incassato','Residuo','Ultimo pagamento']);cn.forEach(c=>rows.push([c.apt,c.tenant,fm(c.month),fd(c.scad),f2(c.due),f2(c.paid),f2(c.due-c.paid),fd(c.last)]))}
  return fileDlg('report-'+fname+'.csv',new Blob(['\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv'}),'Report CSV')}
 const shD=[...sh].sort((x,y)=>cmp(x.apt,y.apt)||cmp(x.tenant,y.tenant)||String(x.spent_on).localeCompare(String(y.spent_on))),spN=x=>[x.type,x.desc].filter(Boolean).join(' – ')||'Spesa';
 const by={};sh.forEach(x=>{const k=x.apt+'\u0000'+x.tenant,b=by[k]||(by[k]={apt:x.apt,tenant:x.tenant,q:0,p:0});b.q+=x.final_cents;b.p+=x.paid});const tot=sum0(ex.map(e=>Math.round(e.amount*100))),totL=sum0(exL.map(e=>Math.round(e.landlord_amount*100))),cd=sum0(cn.map(c=>c.due)),cp=sum0(cn.map(c=>c.paid)),
 spL=p.spese&&p.locatore?'spese inquilini e locatore':p.locatore?'spese locatore':'spese',
 title=p.late?'Report ritardi al '+fd(t0):p.canoni?(p.spese||p.locatore?'Report canoni e '+spL:'Report canoni'):(p.locatore?'Report '+spL:'Ripartizione spese'),hS=p.late?'Spese con quote in ritardo':'Spese sostenute',hC=p.late?'Canoni in ritardo':'Canoni di locazione',perT=p.late?'Situazione al '+fd(t0)+': solo spese e canoni in ritardo (periodo non considerato)':'Periodo: '+fd(p.from)+' / '+fd(p.to),
 spB=p.spese?`<h3>${hS}</h3>
  <table><tr>${ah}<th>Scadenza<th>Tipo<th>Descrizione<th>Importo<th>Competenza</tr>${ex.map(e=>`<tr>${ac(e.apt)}<td>${fd(e.spent_on)}<td>${esc(e.type)}<td>${esc(e.description)}<td>${eur(e.amount)}<td>${fd(e.period_from)} / ${fd(e.period_to)}</tr>`).join('')}</table><p><b>Totale spese: ${eur(tot/100)}</b></p>
  <h3>Quote per inquilino</h3><p>Criterio: ${esc([...new Set(sh.map(x=>x.criterion))].join(', ')||'nessuna ripartizione registrata')}</p><table><tr>${ah}<th>Inquilino<th>Quota<th>Versato<th>Da versare</tr>${Object.values(by).sort((x,y)=>cmp(x.apt,y.apt)||cmp(x.tenant,y.tenant)).map(v=>`<tr>${ac(v.apt)}<td>${tnTag(v.tenant)}<td>${eur(v.q/100)}<td>${eur(v.p/100)}<td>${eur((v.q-v.p)/100)}</tr>`).join('')}</table>
  ${shD.length?`<h3>Dettaglio delle quote</h3><table><tr>${ah}<th>Inquilino<th>Scadenza<th>Spesa<th>Competenza<th>Quota<th>Versato<th>Da versare</tr>${shD.map(x=>`<tr>${ac(x.apt)}<td>${tnTag(x.tenant)}<td>${fd(x.spent_on)}<td>${esc(spN(x))}<td>${fd(x.pf)} / ${fd(x.pt)}<td>${eur(x.final_cents/100)}<td>${eur(x.paid/100)}<td>${eur((x.final_cents-x.paid)/100)}</tr>`).join('')}</table>`:''}
  ${ex.some(e=>!als.find(x=>x.expense_id===e.id))?'<p><i>Attenzione: alcune spese non sono ancora ripartite.</i></p>':''}${sh.some(x=>x.modified)?'<p><i>Alcune quote sono state modificate manualmente.</i></p>':''}`:'',
 lcB=p.locatore?`<h3>Spese locatore sostenute</h3>
  <table><tr>${ah}<th>Scadenza<th>Tipo<th>Descrizione<th>Importo<th>Competenza</tr>${exL.map(e=>`<tr>${ac(e.apt)}<td>${fd(e.spent_on)}<td>${esc(e.type)}<td>${esc(e.description)}<td>${eur(e.landlord_amount)}<td>${fd(e.period_from)} / ${fd(e.period_to)}</tr>`).join('')}</table>${exL.length?`<p><b>Totale spese locatore: ${eur(totL/100)}</b></p>`:'<p><i>Nessuna spesa locatore nel periodo selezionato.</i></p>'}`:'',
 cnB=p.canoni?`<h3>${hC}</h3>${cn.length?`<table><tr>${ah}<th>Inquilino<th>Mese<th>Scadenza<th>Dovuto<th>Incassato<th>Residuo</tr>${cn.map(c=>`<tr>${ac(c.apt)}<td>${tnTag(c.tenant)}<td>${fm(c.month)}<td>${fd(c.scad)}<td>${eur(c.due/100)}<td>${eur(c.paid/100)}<td>${eur((c.due-c.paid)/100)}</tr>`).join('')}</table><p><b>Totale dovuto: ${eur(cd/100)} · Incassato: ${eur(cp/100)} · Residuo: ${eur((cd-cp)/100)}</b></p>`:(p.late?'<p><i>Nessun canone in ritardo.</i></p>':'<p><i>Nessun canone nel periodo selezionato.</i></p>')}`:'';
 const acol=n=>aptCol(Ap.find(x=>x.name===n)?.id),AC=ap?[]:[{h:'Appartamento',w:2}],ACr=(n)=>ap?[]:[{tag:'apt',text:n,color:acol(n)}],R=[{t:'h1',text:title},
  {t:'line',runs:ap?[{tag:'apt',text:ap.name,color:aptCol(ap.id)},{text:' — '+ap.address+', '+ap.city}]:[{text:'Tutti gli appartamenti',bold:1}]}];
 if(p.tenant)R.push({t:'line',runs:[{text:'Inquilino: '},{tag:'tn',text:tn(+p.tenant)}]});R.push({t:'line',runs:[{text:perT}]});
 const expCols=[...AC,{h:'Scadenza',w:1.5},{h:'Tipo',w:1.4},{h:'Descrizione',w:3.4},{h:'Importo',w:1.5,a:'r'},{h:'Competenza',w:3}];
 if(p.spese){R.push({t:'h3',text:hS},{t:'table',cols:expCols,rows:ex.map(e=>[...ACr(e.apt),fd(e.spent_on),e.type,e.description,eur(e.amount),fd(e.period_from)+' / '+fd(e.period_to)])},{t:'p',bold:1,text:'Totale spese: '+eur(tot/100)},
  {t:'h3',text:'Quote per inquilino'},{t:'p',text:'Criterio: '+([...new Set(sh.map(x=>x.criterion))].join(', ')||'nessuna ripartizione registrata')},
  {t:'table',cols:[...AC,{h:'Inquilino',w:2.4},{h:'Quota',w:1.5,a:'r'},{h:'Versato',w:1.5,a:'r'},{h:'Da versare',w:1.6,a:'r'}],rows:Object.values(by).sort((x,y)=>cmp(x.apt,y.apt)||cmp(x.tenant,y.tenant)).map(v=>[...ACr(v.apt),{tag:'tn',text:v.tenant},eur(v.q/100),eur(v.p/100),eur((v.q-v.p)/100)])});
  if(shD.length)R.push({t:'h3',text:'Dettaglio delle quote'},{t:'table',cols:[...AC,{h:'Inquilino',w:2.2},{h:'Scadenza',w:1.4},{h:'Spesa',w:2.4},{h:'Competenza',w:2.6},{h:'Quota',w:1.3,a:'r'},{h:'Versato',w:1.3,a:'r'},{h:'Da versare',w:1.4,a:'r'}],rows:shD.map(x=>[...ACr(x.apt),{tag:'tn',text:x.tenant},fd(x.spent_on),spN(x),fd(x.pf)+' / '+fd(x.pt),eur(x.final_cents/100),eur(x.paid/100),eur((x.final_cents-x.paid)/100)])});
  if(ex.some(e=>!als.find(x=>x.expense_id===e.id)))R.push({t:'p',it:1,text:'Attenzione: alcune spese non sono ancora ripartite.'});if(sh.some(x=>x.modified))R.push({t:'p',it:1,text:'Alcune quote sono state modificate manualmente.'})}
 if(p.locatore){R.push({t:'h3',text:'Spese locatore sostenute'},{t:'table',cols:expCols,rows:exL.map(e=>[...ACr(e.apt),fd(e.spent_on),e.type,e.description,eur(e.landlord_amount),fd(e.period_from)+' / '+fd(e.period_to)])});
  if(exL.length)R.push({t:'p',bold:1,text:'Totale spese locatore: '+eur(totL/100)})}
 if(p.canoni){R.push({t:'h3',text:hC},{t:'table',cols:[...AC,{h:'Inquilino',w:2.4},{h:'Mese',w:1.2},{h:'Scadenza',w:1.4},{h:'Dovuto',w:1.4,a:'r'},{h:'Incassato',w:1.4,a:'r'},{h:'Residuo',w:1.4,a:'r'}],rows:cn.map(c=>[...ACr(c.apt),{tag:'tn',text:c.tenant},fm(c.month),fd(c.scad),eur(c.due/100),eur(c.paid/100),eur((c.due-c.paid)/100)])});
  if(cn.length)R.push({t:'p',bold:1,text:'Totale dovuto: '+eur(cd/100)+' · Incassato: '+eur(cp/100)+' · Residuo: '+eur((cd-cp)/100)})}
 st.LASTREP={blocks:R,title,p,name:'report-'+fname+'.pdf',tenant:p.tenant?te.find(x=>x.id==p.tenant)||null:null,apt:ap?ap.name:''};
 $('#dlg').innerHTML=`<div class=fb><div id=pr><h2>${title}</h2><p>${ap?`${aptTag(ap.name,ap.id)} — ${esc(ap.address)}, ${esc(ap.city)}`:'<b>Tutti gli appartamenti</b>'}${p.tenant?'<br>Inquilino: '+tnTag(tn(+p.tenant)):''}<br>${perT}</p>${spB}${lcB}${cnB}</div></div><div class=ft><button onclick="savePdf()">Salva PDF</button>${p.tenant?'<button class=wa onclick="waSend()">Invia su WhatsApp</button>':''}<button class=sec onclick="doPrint()">Stampa</button><button class=sec onclick="$('#dlg').close()">Chiudi</button></div>`;$('#dlg').showModal()}
 catch(e){alert(typeof e==='string'?e:'Errore: '+(e?.message||e))}}
export async function report(){const[Ap,Te,Co]=await Promise.all([api('apartments'),api('tenants'),api('contracts')]),y=new Date().toISOString().slice(0,10),nm=t=>t.last_name+' '+t.first_name;
 $('#main').innerHTML=`<h2>Report e PDF</h2><label>Appartamento (facoltativo)<select id=ra><option value="">Tutti gli appartamenti</option>${Ap.slice().sort((x,z)=>x.name.localeCompare(z.name,'it')).map(a=>`<option value=${a.id}>${esc(a.name)}</option>`).join('')}</select></label>
 <label>Inquilino (facoltativo)<select id=rt></select></label>
 <div style="margin:10px 0 4px"><b>Includi nel report</b></div><label class=ck><input type=checkbox id=rs checked>Spese inquilini</label><label class=ck><input type=checkbox id=rl>Spese locatore</label><label class=ck><input type=checkbox id=rc checked>Canoni</label>
 <label>Dal<input type=date id=rf value="${y.slice(0,8)}01"></label><label>Al<input type=date id=rto value="${y}"></label>
 <div><button data-p=1>Mese</button><button data-p=3>Trimestre</button><button data-p=12>Anno</button> (dal “Dal” scelto)</div>
 <div style="margin-top:10px"><button type=button id=rlate data-late=1></button> <small class=mut id=rlaten></small></div>
 <div style="margin-top:12px"><button data-o=pdf>Genera PDF</button><button data-o=csv>Esporta CSV/Excel</button></div>`;
 const fillT=()=>{const a=$('#ra').value,cur=$('#rt').value,ids=a?new Set(Co.filter(c=>c.apartment_id==a).map(c=>c.tenant_id)):null,L=Te.filter(t=>!ids||ids.has(t.id)).sort((x,z)=>nm(x).localeCompare(nm(z),'it'));
  $('#rt').innerHTML='<option value="">Tutti</option>'+L.map(t=>`<option value=${t.id}>${esc(R.tenants(t))}</option>`).join('');if(L.some(t=>t.id==cur))$('#rt').value=cur};
 fillT();$('#ra').onchange=fillT;
 // «Solo in ritardo ad oggi»: ignora Dal/Al e le spese locatore
 const lateUI=()=>{const on=!!st.RLATE,b=$('#rlate');b.className=on?'lateon':'sec';b.textContent=(on?'✓ ':'')+'Solo in ritardo ad oggi';b.setAttribute('aria-pressed',on);
  for(const x of document.querySelectorAll('#rf,#rto,#main [data-p],#rl'))x.disabled=on;$('#rlaten').textContent=on?'Spese e canoni in ritardo al '+fd(today())+': il periodo Dal/Al e le spese locatore non sono considerati.':''};lateUI();
 $('#main').onclick=e=>{const p=e.target.dataset.p,o=e.target.dataset.o;if(e.target.dataset.late){st.RLATE=!st.RLATE;lateUI();return}
  if(p){const f=new Date($('#rf').value),t=new Date(Date.UTC(f.getUTCFullYear(),f.getUTCMonth()+ +p,0));$('#rto').value=t.toISOString().slice(0,10)}
  if(o)localReport(o,{apartment:$('#ra').value,tenant:$('#rt').value,from:$('#rf').value,to:$('#rto').value,spese:$('#rs').checked,locatore:$('#rl').checked,canoni:$('#rc').checked,late:!!st.RLATE})}}
