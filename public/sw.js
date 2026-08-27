const C="donghuaku-v3";const A=["/","/index.html","/js/app.js","/manifest.json","/icon-192.png","/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){let c=r.clone();caches.open(C).then(k=>k.put(e.request,c))}return r}).catch(()=>caches.match("/index.html"))))});
