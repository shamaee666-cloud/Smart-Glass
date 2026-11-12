const CACHE_NAME="smartglass-ai-v040";
const CORE=["./","./index.html","./app.js","./manifest.webmanifest"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(fetch(new Request(e.request,{cache:"no-store"})).then(r=>{
    const copy=r.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)); return r;
  }).catch(()=>caches.match(e.request)));
});