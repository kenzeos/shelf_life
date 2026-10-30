const CACHE = "shelf-v24";
const IMG = "shelf-img-v1";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, {cache: "reload"})))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== IMG).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  // App pages: network first so updates show up, offline copy as backup
  if (same && (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/"))) {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }
  // App files (icons, manifest)
  if (same) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }
  // Cover images: keep a copy so your shelf looks right offline
  if (req.destination === "image") {
    e.respondWith(caches.open(IMG).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()).catch(()=>{}); return res; }).catch(() => hit))));
    return;
  }
  // Everything else (database lookups) goes straight to the network
});
// Tapping a notification opens the app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: "window"}).then(cs => {
    const c = cs.find(x => "focus" in x);
    return c ? c.focus().then(w => w && w.navigate ? w.navigate("./index.html#updates") : null) : self.clients.openWindow("./index.html#updates");
  }));
});
