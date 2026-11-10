const F=['./','index.html','manifest.json','icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open('v7').then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open('v7').then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))});
