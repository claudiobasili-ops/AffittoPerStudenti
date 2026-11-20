// Componenti d'interfaccia comuni: etichette, ordinamento, finestre file
import { all, docBlob, get } from './db.js';
import { SORT, st } from './state.js';
import { $, esc } from './util.js';

export const mn = (id,v)=>`<span class=mnav><button type=button class=sec data-mn="${id}:-1" aria-label="Mese precedente">‹</button><input type=month id=${id} value="${v}"><button type=button class=sec data-mn="${id}:1" aria-label="Mese successivo">›</button></span>`;
const PAL = ['#2563eb','#ea580c','#9333ea','#db2777','#0891b2','#ca8a04','#4f46e5','#0d9488','#92400e','#475569'];
export async function loadApc(){st.APC={};let mx=0;for(const a of await all('apartments')){st.APC[a.id]=/^#[0-9a-f]{6}$/i.test(a.color||'')?a.color:PAL[a.id%PAL.length];mx=Math.max(mx,a.id)}st.APN=PAL[(mx+1)%PAL.length]}
export const aptCol = id=>st.APC[id]||'#64748b';
export const fgc = c=>{const n=parseInt(c.slice(1),16);return(.299*(n>>16)+.587*((n>>8)&255)+.114*(n&255))/255>.62?'#111827':'#ffffff'};
export const aptTag = (n,id)=>{if(!n)return'';const c=aptCol(id);return`<span class=at style="background:${c};color:${fgc(c)}">${esc(n)}</span>`};
export const tnTag = n=>n?`<span class=tn>${esc(n)}</span>`:'';
export function srt(a,st,sv){if(!st)return a;const x=[...a];x.sort((p,q)=>{const u=sv(p,st.k),v=sv(q,st.k),c=typeof u=='number'&&typeof v=='number'?u-v:String(u??'').localeCompare(String(v??''),'it',{numeric:true});return(c*st.d)||0});return x}
function togSort(k0,k){const c=SORT[k0];SORT[k0]=!c||c.k!=k?{k,d:1}:c.d==1?{k,d:-1}:null}
export const thS = (k0,k,l)=>`<th class=srt data-s="${k}" title="Clic per ordinare">${l}${SORT[k0]?.k==k?(SORT[k0].d>0?' ▲':' ▼'):''}`;
export const sortBar = (k0,cols)=>`<span class=sortbar><select id=so aria-label="Ordina per"><option value="">Ordina: predefinito</option>${cols.map(([k,l])=>`<option value="${k}"${SORT[k0]?.k==k?' selected':''}>${esc(l)}</option>`).join('')}</select><button type=button class=sec id=sd title="Inverti ordine">${SORT[k0]?.d<0?'▼':'▲'}</button></span>`;
export function sortWire(k0,again){const so=$('#so');if(!so)return;so.onchange=()=>{SORT[k0]=so.value?{k:so.value,d:SORT[k0]?.d||1}:null;again()};$('#sd').onclick=()=>{if(SORT[k0]){SORT[k0].d*=-1;again()}};
 document.querySelectorAll('#main th[data-s]').forEach(th=>th.onclick=()=>{togSort(k0,th.dataset.s);again()})}
export function bdg(t,ok,nu){return`<span class="bdg ${nu?'nu':ok?'ok':'no'}">${esc(t)}</span>`}
export function doPrint(){$('#pa').innerHTML=$('#pr').innerHTML;print()}
export function aptSel(AP,v){return`<select id=fa><option value="">Tutti gli appartamenti</option>${AP.map(a=>`<option value=${a.id} ${a.id==v?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`}
export function fileDlg(name,blob,title,back){const d=$('#dlg'),u=URL.createObjectURL(blob);d.onclick=null;
 d.innerHTML=`<div class=fb><h3>${esc(title)}</h3>${/^image\//.test(blob.type)?`<img src="${u}" alt="" onerror="this.style.display='none'" style="max-width:100%;max-height:50vh;display:block;margin:0 auto 10px;border-radius:8px">`:''}<p style="overflow-wrap:anywhere">${esc(name)}</p></div>
 <div class=ft><button type=button id=sh>Condividi / Salva in File…</button> <a href="${u}" download="${esc(name)}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#e5e7eb;color:#111;text-decoration:none;margin:2px">Apri / scarica</a>${back?' <button type=button class=sec id=bkd>Indietro</button>':''} <button type=button class=sec onclick="$('#dlg').close()">Chiudi</button></div>`;if(!d.open)d.showModal();
 if(back)$('#bkd').onclick=back;
 $('#sh').onclick=async()=>{const f=new File([blob],name,{type:blob.type||'application/octet-stream'});try{if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:name});else alert('Usa “Apri / scarica”')}catch{}}}
export async function openDoc(id,back){const d=await get('documents',id);fileDlg(d.filename,docBlob(d),'Allegato',back)}
