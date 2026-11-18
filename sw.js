const F=['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'css/app.css', 'js/api.js', 'js/backup.js', 'js/cloud/supabase.js', 'js/cloud/sync.js', 'js/cloud/whatsapp.js', 'js/db.js', 'js/lib/pdf.js', 'js/main.js', 'js/menu.js', 'js/rules.js', 'js/schema.js', 'js/state.js', 'js/ui.js', 'js/util.js', 'js/views/attachments.js', 'js/views/charts.js', 'js/views/dashboard.js', 'js/views/deposits.js', 'js/views/dues.js', 'js/views/entities.js', 'js/views/expenses.js', 'js/views/report.js', 'js/views/settings.js'];
const C='v13';
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))});
