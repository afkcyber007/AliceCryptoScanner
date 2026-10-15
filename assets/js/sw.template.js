/* AliceCryptoScanner service worker — version __VERSION__.
   Pages: network first (always fresh), offline copy as fallback.
   Styles, scripts, images: cached by version.
   The Alice server (live prices, accounts, payments) is never cached. */
const VERSION = "__VERSION__";
const BASE = "__BASE__";
const STATIC = "alice-static-" + VERSION;
const PAGES = "alice-pages-" + VERSION;
const PRECACHE = [BASE, BASE + "app/", BASE + "assets/css/main.css?v=" + VERSION, BASE + "assets/css/app.css?v=" + VERSION,
  BASE + "static/img/logo-mark.svg", BASE + "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;            // server API, fonts, ads: straight to the network
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(PAGES).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match(BASE + "app/"))));
    return;
  }
  if (/\/(assets|static)\//.test(u.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
