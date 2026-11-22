// Menù Grafici
import { api } from './api.js';
import { st } from './state.js';
import { aptCol, aptTag, mn } from './ui.js';
import { $, esc, eur, fd, today } from './util.js';

function donut(parts,c1,c2,lab){const T=parts.reduce((a,p)=>a+p.v,0);if(T<=0)return'<p class=mut>Nessun dato per questo mese.</p>';let off=25;
 const arcs=parts.filter(p=>p.v>0).map(p=>{const l=p.v/T*100,a=`<circle cx=21 cy=21 r=15.915 fill=none stroke="${p.c}" stroke-width=6 stroke-dasharray="${l} ${100-l}" stroke-dashoffset="${off}"></circle>`;off-=l;return a}).join('');
 return`<div class=dn><svg viewBox="0 0 42 42" role=img aria-label="${esc(lab)}"><circle cx=21 cy=21 r=15.915 fill=none stroke="#e5e7eb" stroke-width=6></circle>${arcs}<text x=21 y=21.8 text-anchor=middle font-size=7 font-weight=700 fill="#111827">${esc(c1)}</text><text x=21 y=26.6 text-anchor=middle font-size=3.2 fill="#6b7280">${esc(c2)}</text></svg>
 <ul class=lg>${parts.map(p=>`<li><i style="background:${p.c}"></i>${esc(p.n)}<span class=v>${eur(p.v)}</span><small>${Math.round(p.v/T*100)}%</small></li>`).join('')}</ul></div>`}
function hbars(rows,ser){const mx=Math.max(0,...rows.flatMap(r=>r.v));if(!rows.length)return'<p class=mut>Nessun appartamento.</p>';
 return rows.map(r=>`<div class=bg style="border-left:5px solid ${aptCol(r.i)};padding-left:8px"><div class=bn>${aptTag(r.n,r.i)}</div>${ser.map((x,i)=>`<div class=br><span class=bl>${x.n}</span><div class=bt><div style="width:${mx>0?Math.max(0,r.v[i])/mx*100:0}%;background:${x.c}"></div></div><span class=bv>${eur(r.v[i])}</span></div>`).join('')}</div>`).join('')}
export async function charts(m){m=m||st.curM;st.curM=m;const D=await api('dashboard?month='+m),r2=v=>Math.round(v*100)/100,sum=k=>r2(D.per.reduce((a,x)=>a+ +x[k],0)),
 ex=sum('expected'),co=sum('collected'),se=sum('expenses'),si=sum('expCollected'),sd=sum('expToCollect'),A=D.asOf,G='#16a34a',R='#dc2626',B='#1d4ed8',
 pc=(a,b)=>b>0?Math.round(a/b*100)+'%':'—',
 tot=[{n:'In ritardo (canoni e spese)',v:A.arrears,c:'#b91c1c'},{n:'Canoni del mese in corso',v:A.current,c:'#f59e0b'},{n:'Spese da incassare (non scadute, entro il '+fd(A.cmEnd)+')',v:A.expDue,c:'#7c3aed'}];
 $('#main').innerHTML=`<h2>Grafici</h2>${mn('cmm',m)}
 <div class=cg><div class=card><h3>Canoni del mese</h3>${donut([{n:'Incassati',v:Math.max(0,co),c:G},{n:'Da incassare',v:Math.max(0,r2(ex-co)),c:R}],pc(co,ex),'incassato','Canoni incassati e da incassare')}</div>
 <div class=card><h3>Spese del mese</h3>${donut([{n:'Incassate',v:si,c:G},{n:'Da incassare',v:sd,c:R},{n:'Non ripartite',v:Math.max(0,r2(se-si-sd)),c:'#9ca3af'}],pc(si,se),'incassato','Spese incassate, da incassare e non ripartite')}</div></div>
 <div class=card style="margin-top:10px"><h3 style="margin:0 0 6px">Totale da incassare ad oggi (${fd(today())})</h3>
 ${A.total>0?`<div class=stk role=img aria-label="Composizione del totale da incassare ad oggi">${tot.filter(x=>x.v>0).map(x=>`<div style="width:${x.v/A.total*100}%;background:${x.c}"></div>`).join('')}</div>`:'<p class=mut>Niente da incassare.</p>'}
 <ul class=lg>${tot.map(x=>`<li><i style="background:${x.c}"></i>${x.n}<span class=v>${eur(x.v)}</span></li>`).join('')}<li style="border-top:1px solid #e5e7eb;padding-top:4px"><span><strong>Totale ad oggi</strong></span><span class=v>${eur(A.total)}</span></li></ul></div>
 <div class=cg><div class=card><h3>Canoni per appartamento</h3>${hbars(D.per.map(p=>({n:p.name,i:p.id,v:[+p.expected,+p.collected,Math.max(0,r2(p.expected-p.collected))]})),[{n:'Previsti',c:B},{n:'Incassati',c:G},{n:'Da incassare',c:R}])}</div>
 <div class=card><h3>Spese per appartamento</h3>${hbars(D.per.map(p=>({n:p.name,i:p.id,v:[+p.expenses,+p.expCollected,+p.expToCollect,+p.landlord]})),[{n:'Previste',c:B},{n:'Incassate',c:G},{n:'Da incassare',c:R},{n:'Locatore',c:'#64748b'}])}</div></div>`;
 $('#cmm').onchange=e=>charts(e.target.value||st.curM)}
