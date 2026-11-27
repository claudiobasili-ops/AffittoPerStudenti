const F=['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'app.css', 'api.js', 'backup.js', 'cloud-supabase.js', 'cloud-sync.js', 'cloud-whatsapp.js', 'db.js', 'lib-pdf.js', 'main.js', 'menu.js', 'rules.js', 'schema.js', 'state.js', 'ui.js', 'util.js', 'views-attachments.js', 'views-charts.js', 'views-dashboard.js', 'views-deposits.js', 'views-dues.js', 'views-entities.js', 'views-expenses.js', 'views-finance.js', 'views-report.js', 'views-settings.js'];
const C='v36';
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))});
