const CACHE = "cuoti-v4";
const ASSETS = ["./", "./index.html", "./styles.css",
  "./data.js", "./store.js", "./analyze.js", "./variants.js", "./sprint.js", "./plan.js", "./app.js",
  "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-180.png", "./icons/icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => { try{ c.put(e.request, copy); }catch(_){} });
    return res;
  }).catch(()=>caches.match("./index.html"))));
});
