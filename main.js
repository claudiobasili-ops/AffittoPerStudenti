// Avvio dell'applicazione
import { api } from './api.js';
import { backupUI } from './backup.js';
import { waSend } from './cloud-whatsapp.js';
import { initDB } from './db.js';
import { V, nav } from './menu.js';
import { st } from './state.js';
import { doPrint } from './ui.js';
import { $, thisM } from './util.js';
import './cloud-sync.js';
import { dash } from './views-dashboard.js';
import { savePdf } from './views-report.js';

// Funzioni richiamate dagli attributi onclick dell'HTML generato
Object.assign(window, { $, waSend, savePdf, doPrint });

document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-mn]');if(!b)return;const[id,d]=b.dataset.mn.split(':'),i=document.getElementById(id);if(!i)return;
 const[y,m]=(i.value||thisM()).split('-').map(Number);i.value=new Date(Date.UTC(y,m-1+ +d,1)).toISOString().slice(0,7);i.dispatchEvent(new Event('change',{bubbles:true}))});
$('#nav').onclick=e=>{const k=e.target.dataset.k;if(e.target.id=='bk')backupUI();if(k){st.CURK=k;$('#main').onclick=null;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b==e.target));V[k][1]()}};
function login(){$('#app').hidden=true;$('#login').hidden=false}
$('#lg').onclick=async()=>{try{await api('login',{method:'POST',body:{email:$('#em').value,password:$('#pw').value}});$('#login').hidden=true;$('#app').hidden=false;nav();dash()}catch{}};
initDB().then(()=>{$('#app').hidden=false;nav();document.querySelector('nav button').classList.add('on');dash()}).catch(e=>alert('Archivio dati non disponibile in questo browser: '+e));
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
