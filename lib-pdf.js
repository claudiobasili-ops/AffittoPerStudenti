// Generatore di PDF
import { fgc } from './ui.js';

export function pdfDoc(blocks,title){const PW=595.28,PH=841.89,M=40,CW=PW-2*M,cv=document.createElement('canvas').getContext('2d'),
 tw=(x,z,b)=>{cv.font=(b?'bold ':'')+'1000px Arial, Helvetica, sans-serif';return cv.measureText(x).width/1000*z},
 cp={'€':128,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'…':133,'·':183},
 enc=x=>[...String(x)].map(ch=>{let c=ch.codePointAt(0);if(cp[ch])c=cp[ch];else if(c>255)c=63;return c==40||c==41||c==92?'\\'+ch:c<32?' ':c<127?ch:'\\'+c.toString(8).padStart(3,'0')}).join(''),
 rgb=h=>{const n=parseInt(h.slice(1),16);return[n>>16,(n>>8)&255,n&255].map(v=>(v/255).toFixed(3)).join(' ')},f=n=>n.toFixed(2),pages=[];let ops,y;
 const np=()=>{ops=[];pages.push(ops);y=PH-M},
 txt=(x,yb,t,z,b,c,it)=>ops.push(`BT /F${it?3:b?2:1} ${z} Tf ${rgb(c||'#111827')} rg ${f(x)} ${f(yb)} Td (${enc(t)}) Tj ET`),
 rr=(x,b,w,h,r,c)=>{const k=.5523*r;ops.push(`${rgb(c)} rg ${f(x+r)} ${f(b)} m ${f(x+w-r)} ${f(b)} l ${f(x+w-r+k)} ${f(b)} ${f(x+w)} ${f(b+r-k)} ${f(x+w)} ${f(b+r)} c ${f(x+w)} ${f(b+h-r)} l ${f(x+w)} ${f(b+h-r+k)} ${f(x+w-r+k)} ${f(b+h)} ${f(x+w-r)} ${f(b+h)} c ${f(x+r)} ${f(b+h)} l ${f(x+r-k)} ${f(b+h)} ${f(x)} ${f(b+h-r+k)} ${f(x)} ${f(b+h-r)} c ${f(x)} ${f(b+r)} l ${f(x)} ${f(b+r-k)} ${f(x+r-k)} ${f(b)} ${f(x+r)} ${f(b)} c f`)},
 hl=(yy,c)=>ops.push(`${rgb(c)} RG .5 w ${f(M)} ${f(yy)} m ${f(M+CW)} ${f(yy)} l S`),
 wrap=(x,z,b,mw)=>{const out=[];let cur='';for(const w of String(x).split(/\s+/).filter(Boolean)){const t=cur?cur+' '+w:w;if(cur&&tw(t,z,b)>mw){out.push(cur);cur=w}else cur=t}if(cur||!out.length)out.push(cur);return out},
 pill=(x,yb,t,z,tag,col)=>{const w=tw(t,z,1)+8;rr(x,yb-3,w,z+5,3,tag=='apt'?col:'#e0e7ff');txt(x+4,yb,t,z,1,tag=='apt'?fgc(col):'#1e3a8a');return w},
 table=b=>{const z=9,lh=14,px=4,py=4,tot=b.cols.reduce((a,c)=>a+c.w,0),ws=b.cols.map(c=>c.w/tot*CW),xs=ws.map((_,i)=>M+ws.slice(0,i).reduce((a,v)=>a+v,0));
  const row=(cells,head)=>{const L=cells.map((c,i)=>{const t=typeof c=='object'?c:{text:c};return{t,ls:wrap(t.text??'',z,head||!!t.tag,ws[i]-2*px-(t.tag?8:0))}}),n=Math.max(1,...L.map(l=>l.ls.length)),h=n*lh+2*py;
   if(y-h<M+16){np();if(!head)row(b.cols.map(c=>c.h),1)}
   if(head)ops.push(`${rgb('#f1f5f9')} rg ${f(M)} ${f(y-h)} ${f(CW)} ${f(h)} re f`);
   L.forEach((l,i)=>l.ls.forEach((x,k)=>{const yb=y-py-z-k*lh+1,bold=head||!!l.t.tag,w=tw(x,z,bold)+(l.t.tag?8:0),xx=b.cols[i].a=='r'&&!l.t.tag?xs[i]+ws[i]-px-w:xs[i]+px;
    if(l.t.tag)pill(xx,yb,x,z,l.t.tag,l.t.color);else txt(xx,yb,x,z,head,head?'#374151':'#111827')}));
   hl(y-h,head?'#9ca3af':'#e5e7eb');y-=h};
  row(b.cols.map(c=>c.h),1);b.rows.forEach(r=>row(r));if(!b.rows.length){txt(M+4,y-14,'Nessun dato nel periodo selezionato.',9,0,'#6b7280',1);y-=22}y-=8};
 np();
 for(const b of blocks){
  if(b.t=='h1'){if(y<M+60)np();txt(M,y-16,b.text,16,1);y-=28}
  else if(b.t=='h3'){if(y<M+90)np();y-=8;txt(M,y-12,b.text,12,1,'#1e3a8a');y-=22}
  else if(b.t=='line'){if(y<M+40)np();let x=M;for(const r of b.runs){if(r.tag)x+=pill(x,y-11,r.text,10,r.tag,r.color);else{txt(x,y-11,r.text,10,r.bold);x+=tw(r.text,10,r.bold)}}y-=19}
  else if(b.t=='p'){for(const l of wrap(b.text,10,b.bold,CW)){if(y<M+30)np();txt(M,y-11,l,10,b.bold,b.it?'#4b5563':'#111827',b.it);y-=15}y-=4}
  else if(b.t=='table')table(b)}
 const N=pages.length;pages.forEach((o,i)=>{const t='Pagina '+(i+1)+' di '+N;ops=o;txt((PW-tw(t,8))/2,M/2,t,8,0,'#6b7280')});
 const objs=[],A=x=>objs.push(x);
 A('<< /Type /Catalog /Pages 2 0 R >>');A(`<< /Type /Pages /Kids [${pages.map((_,i)=>(6+2*i)+' 0 R').join(' ')}] /Count ${N} >>`);
 for(const n of['Helvetica','Helvetica-Bold','Helvetica-Oblique'])A(`<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`);
 pages.forEach((o,i)=>{A(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${7+2*i} 0 R >>`);const c=o.join('\n');A(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`)});
 A(`<< /Title (${enc(title)}) /Producer (Affitti Studenti) >>`);
 let out='%PDF-1.4\n';const off=[];objs.forEach((x,i)=>{off.push(out.length);out+=`${i+1} 0 obj\n${x}\nendobj\n`});
 const xr=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${xr}\n%%EOF`;
 return new Blob([out],{type:'application/pdf'})}
