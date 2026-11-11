const F=['./','index.html','manifest.json','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open('v10').then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open('v10').then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))});
