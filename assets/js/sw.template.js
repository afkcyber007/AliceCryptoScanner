/* Alice Forex/Crypto Scanner service worker — version __VERSION__.
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

/* ---------------------------------------------------------------- push notifications from the Alice server */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "Alice", body: e.data ? e.data.text() : "" }; }
  const title = d.title || "Alice Forex/Crypto Scanner";
  const opts = {
    body: d.body || "", tag: d.tag || d.kind || "alice", renotify: true,
    icon: BASE + "static/img/icons/icon-192.png", badge: BASE + "static/img/icons/badge-96.png",
    data: { url: BASE + "app/#/" + String(d.route || "home").replace(/^\/+/, "") },
    vibrate: [80, 40, 80],
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || BASE + "app/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.indexOf(BASE + "app/") !== -1 && "focus" in c) {
        return c.focus().then((w) => { const win = w || c; return win.navigate ? win.navigate(url) : null; }).catch(() => {});
      }
    }
    return self.clients.openWindow(url);
  }));
});

self.addEventListener("pushsubscriptionchange", (e) => {
  // The browser renewed the subscription: the web app re-registers it the next time it opens.
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((list) => list.forEach((c) => c.postMessage({ type: "resubscribe" }))));
});
