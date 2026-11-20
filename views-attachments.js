// Allegati delle spese
import { api, rm } from './api.js';
import { openDoc } from './ui.js';
import { $, esc, eur, stamp } from './util.js';

async function shrinkImg(f,max=1800,q=.82){try{if(!/^image\/(jpeg|png|webp)$/.test(f.type))return f;const u=URL.createObjectURL(f);
  const im=await new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ko;i.src=u});URL.revokeObjectURL(u);const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  const b=await new Promise(r=>c.toBlob(r,'image/jpeg',q));return b&&b.size<f.size?new File([b],'x.jpg',{type:'image/jpeg'}):f}catch{return f}}
export async function attach(e,after,msg){const d=$('#dlg'),D=await api(`expenses/${e.id}/docs`);d.onclick=null;d.onclose=()=>{d.onclose=null;after?.()};
 d.innerHTML=`<div class=fb><h3>Allegati</h3><p class=mut>${esc(e.description||'Spesa')} · ${eur(e.amount)}</p>${msg?`<p class=okm>✓ ${esc(msg)}</p>`:''}${D.length?D.map(x=>`<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin:6px 0"><span style="overflow-wrap:anywhere">📎 ${esc(x.filename)}</span><span style="display:flex;gap:6px;flex:none"><button type=button data-od=${x.id}>Apri</button><button type=button class=sec data-dd=${x.id} title="Elimina allegato" aria-label="Elimina allegato">🗑</button></span></div>`).join(''):'<p>Nessun allegato.</p>'}
 <p style="margin:8px 0 0"><label class=cam>📷 Scatta foto<input type=file id=afc accept="image/*" capture=environment></label></p>
 <label>Oppure scegli un file (PDF o immagine)<input type=file id=af accept="application/pdf,image/*,.pdf,.heic,.heif"></label></div><div class=ft><button type=button class=sec id=cl2>Chiudi</button></div>`;
 if(!d.open)d.showModal();$('#cl2').onclick=()=>d.close();
 const up=async(f,cam)=>{if(!f)return;if(cam){const g=await shrinkImg(f);f=new File([g],'foto-'+stamp(new Date())+(g.type=='image/jpeg'?'.jpg':g.type=='image/png'?'.png':'.'+(g.type.split('/')[1]||'jpg')),{type:g.type})}
  const fm=new FormData();fm.append('f',f);try{await api(`expenses/${e.id}/doc`,{method:'POST',body:fm});attach(e,after,'Allegato caricato: '+f.name)}catch{}};
 $('#af').onchange=ev=>up(ev.target.files[0],0);$('#afc').onchange=ev=>up(ev.target.files[0],1);
 d.onclick=ev=>{const id=ev.target.dataset.od,dd=ev.target.dataset.dd;if(id)openDoc(+id,()=>attach(e,after));
  if(dd){const f=D.find(x=>x.id==dd);if(f&&confirm('Eliminare l’allegato “'+f.filename+'”?'))rm('documents',+dd).then(()=>attach(e,after,'Allegato eliminato: '+f.filename)).catch(()=>alert('Impossibile eliminare l’allegato'))}}}
