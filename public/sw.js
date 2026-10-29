/* HSK 4 Study Desk offline cache. Caches only the site's own files, never user data. */
const CACHE = "hsk4desk-36dcc6e567";
const FILES = ["/", "/404.html", "/about.html", "/app.js", "/favicon.svg", "/fonts/bricolage.woff", "/fonts/jetbrains-mono.woff", "/index.html", "/privacy.html", "/site.webmanifest", "/styles.css"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("hsk4desk-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/.well-known/")) return;
  const key = url.pathname === "/index.html" ? "/" : url.pathname;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(key);
    const net = fetch(req).then(r => { if (r.ok && r.type === "basic") c.put(key, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net; if (r) return r;
    return (await c.match("/404.html")) || new Response("Offline", { status: 503 });
  }));
});
