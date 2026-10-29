"""Package the public site for its own subdomain (served from the root), with offline support."""
import os, re, shutil, sys, json, hashlib
SITE, OUT, HOST = sys.argv[1], sys.argv[2], sys.argv[3]
PUB = os.path.join(OUT, "public")
shutil.rmtree(OUT, ignore_errors=True); shutil.copytree(SITE, PUB)

def edit(name, fn):
    p = os.path.join(PUB, name); s = open(p, encoding="utf-8").read(); n = fn(s)
    assert n != s, f"no change in {name}"; open(p, "w", encoding="utf-8").write(n)

def privacy(s):
    s = s.replace("<li>Essay drafts in progress, kept in session storage and cleared when you close the tab.</li>",
                  "<li>Essay drafts in progress, kept in session storage and cleared when you close the tab.</li>\n<li>A copy of the site’s own files (pages, styles, word list), kept in your browser’s cache so the desk opens quickly and works offline. It contains none of your data.</li>")
    s = s.replace("<h2>Who runs this site</h2>\n<p>HSK 4 Study Desk is a free study tool run by",
                  f"<h2>Who runs this site</h2>\n<p>HSK 4 Study Desk, at {HOST}, is a free study tool run by")
    s = s.replace("<h2>Features that use your browser</h2>",
                  f"<p>This notice covers {HOST} only. The main crestviewbridge.net website is covered by Crestview Bridge’s own notices.</p>\n\n<h2>Features that use your browser</h2>")
    return s
edit("privacy.html", privacy)

files = []
for root, _, fs in os.walk(PUB):
    for f in fs:
        rel = os.path.relpath(os.path.join(root, f), PUB).replace(os.sep, "/")
        if rel == "_headers" or rel.endswith(".txt") or rel.startswith(".well-known"): continue
        files.append("/" + rel)
files = sorted(set(files + ["/"]))
ver = hashlib.sha256(b"".join(open(os.path.join(PUB, f[1:]), "rb").read() for f in files if f != "/")).hexdigest()[:10]
sw = f'''/* HSK 4 Study Desk offline cache. Caches only the site's own files, never user data. */
const CACHE = "hsk4desk-{ver}";
const FILES = {json.dumps(files)};
self.addEventListener("install", e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener("activate", e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("hsk4desk-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener("fetch", e => {{
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/.well-known/")) return;
  const key = url.pathname === "/index.html" ? "/" : url.pathname;
  e.respondWith(caches.open(CACHE).then(async c => {{
    const hit = await c.match(key);
    const net = fetch(req).then(r => {{ if (r.ok && r.type === "basic") c.put(key, r.clone()); return r; }}).catch(() => null);
    if (hit) {{ e.waitUntil(net); return hit; }}
    const r = await net; if (r) return r;
    return (await c.match("/404.html")) || new Response("Offline", {{ status: 503 }});
  }}));
}});
'''
open(os.path.join(PUB, "sw.js"), "w", encoding="utf-8").write(sw)
edit("app.js", lambda s: s.replace("persistStorage();\ninitNotice();",
     'persistStorage();\ninitNotice();\nif ("serviceWorker" in navigator) { const hadSW = !!navigator.serviceWorker.controller; navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* offline mode unavailable */ }); navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadSW) toast("A new version is ready. Reload to use it."); }); }'))
edit("site.webmanifest", lambda s: json.dumps({**json.loads(s), "scope": "/", "id": "/"}, indent=1))

def headers(s):
    s = s.replace("max-age=31536000; includeSubDomains", "max-age=31536000")
    s = s.replace("worker-src 'none'", "worker-src 'self'")
    return s + "/sw.js\n  Cache-Control: public, max-age=0, must-revalidate\n"
edit("_headers", headers)

open(os.path.join(OUT, "wrangler.jsonc"), "w", encoding="utf-8").write(f'''{{
  // Optional terminal route: serves ./public at https://{HOST} as a static-assets Worker.
  "name": "learn-crestviewbridge",
  "compatibility_date": "2026-10-28",
  "routes": [ {{ "pattern": "{HOST}", "custom_domain": true }} ],
  "assets": {{ "directory": "./public", "not_found_handling": "404-page" }},
  "observability": {{ "enabled": false }}
}}
''')
# zip of the site contents at the root, ready for Cloudflare's drag-and-drop upload
shutil.make_archive(os.path.join(OUT, "upload-to-cloudflare"), "zip", PUB)
print("cached", len(files), "version", ver)
