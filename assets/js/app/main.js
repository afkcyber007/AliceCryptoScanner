/* Alice web app: app shell, navigation and background work. */
import {
  A, $, $$, html, raw, esc, icon, session, plan, isPaid, refreshMe, loadConfig, route, parseHash, match, go, back, navStack,
  makeCtx, on, emit, toast, api, store, errorBox, int,
} from "./core.js";

/* ------------------------------------------------------------------ routes (screens load on demand) */
const S = (file) => () => import("./screens/" + file + ".js?v=" + (A.v || ""));
route("/home", S("home"), { tab: "home" });
route("/scanner", S("scanner"), { tab: "scanner" });
route("/m/:market/:symbol", S("detail"), { tab: "scanner", back: true });
route("/best", S("insights"), { tab: "best", fn: "best" });
route("/activity", S("insights"), { tab: "tools", fn: "activity", back: true });
route("/tools", S("tools"), { tab: "tools" });
route("/gold", S("deep"), { tab: "tools", fn: "gold", back: true });
route("/btc", S("deep"), { tab: "tools", fn: "btc", back: true });
route("/ai", S("ai"), { tab: "tools", back: true });
route("/fib", S("market-tools"), { tab: "tools", fn: "fib", back: true });
route("/strength", S("market-tools"), { tab: "tools", fn: "strength", back: true });
route("/hours", S("market-tools"), { tab: "tools", fn: "hours", back: true });
route("/funding", S("market-tools"), { tab: "tools", fn: "funding", back: true });
route("/converter", S("market-tools"), { tab: "tools", fn: "converter", back: true });
route("/risk", S("risk"), { tab: "tools", back: true });
route("/journal", S("journal"), { tab: "tools", fn: "journal", back: true });
route("/portfolio", S("journal"), { tab: "tools", fn: "portfolio", back: true });
route("/alerts", S("alerts"), { tab: "tools", back: true });
route("/news", S("news"), { tab: "tools", fn: "news", back: true });
route("/calendar", S("news"), { tab: "tools", fn: "calendar", back: true });
route("/academy", S("learn"), { tab: "tools", fn: "academy", back: true });
route("/lesson/:id", S("learn"), { tab: "tools", fn: "lesson", back: true });
route("/stories", S("learn"), { tab: "tools", fn: "stories", back: true });
route("/story/:id", S("learn"), { tab: "tools", fn: "story", back: true });
route("/exchanges", S("learn"), { tab: "tools", fn: "exchanges", back: true });
route("/rewards", S("rewards"), { tab: "profile", fn: "rewards", back: true });
route("/spin", S("rewards"), { tab: "home", fn: "spin", back: true });
route("/chat/:room", S("chat"), { tab: "home", back: true });
route("/profile", S("profile"), { tab: "profile", fn: "profile" });
route("/edit-profile", S("profile"), { tab: "profile", fn: "edit", back: true, auth: true });
route("/password", S("profile"), { tab: "profile", fn: "password", back: true, auth: true });
route("/delete", S("profile"), { tab: "profile", fn: "delete", back: true, auth: true });
route("/payments", S("profile"), { tab: "profile", fn: "payments", back: true, auth: true });
route("/contact", S("profile"), { tab: "profile", fn: "contact", back: true });
route("/install", S("profile"), { tab: "profile", fn: "install", back: true });
route("/upgrade", S("pay"), { tab: "profile", fn: "upgrade", back: true });
route("/pay/:plan/:period", S("pay"), { tab: "profile", fn: "pay", back: true, auth: true });
route("/login", S("auth"), { fn: "login", bare: true });
route("/signup", S("auth"), { fn: "signup", bare: true });
route("/forgot", S("auth"), { fn: "forgot", bare: true, back: true });

/* ------------------------------------------------------------------ navigation shell */
const TABS = [
  ["home", "#/home", "Home", icon.home], ["scanner", "#/scanner", "Scanner", icon.radar], ["best", "#/best", "Best Trades", icon.trophy],
  ["tools", "#/tools", "Tools", icon.grid], ["profile", "#/profile", "Profile", icon.user],
];
const SIDE = [
  ["", [["home", "#/home", "Home", icon.home], ["scanner", "#/scanner", "Scanner", icon.radar], ["best", "#/best", "Best Trades", icon.trophy, "elite"], ["tools", "#/tools", "All tools", icon.grid]]],
  ["Analysis", [["gold", "#/gold", "Gold deep analysis", icon.gold, "elite"], ["btc", "#/btc", "BTC deep analysis", icon.btc, "elite"], ["ai", "#/ai", "AI chart analyzer", icon.ai], ["activity", "#/activity", "Whale radar", icon.whale, "elite"]]],
  ["Market", [["alerts", "#/alerts", "Alerts", icon.bell], ["calendar", "#/calendar", "Economic calendar", icon.cal], ["news", "#/news", "News", icon.news], ["hours", "#/strength", "Strength and hours", icon.clock], ["chat", "#/chat/crypto", "Discussion rooms", icon.chat]]],
  ["You", [["rewards", "#/rewards", "Rewards and coins", icon.coin], ["journal", "#/journal", "Trading journal", icon.journal], ["academy", "#/academy", "Academy", icon.book], ["profile", "#/profile", "Profile", icon.user]]],
];
function drawShell(activeTab, path) {
  $("#tabbar").innerHTML = TABS.map(([id, href, label, ic]) =>
    `<a href="${href}" class="${id === activeTab ? "on" : ""}" ${id === activeTab ? 'aria-current="page"' : ""}><i>${ic}</i><span>${label}</span></a>`).join("");
  const p = plan();
  $("#side-nav").innerHTML = SIDE.map(([g, items]) => (g ? `<div class="side-group">${g}</div>` : "") + items.map(([id, href, label, ic, tier]) => {
    const on = path === href.slice(1) || (id === "chat" && path.startsWith("/chat")) || (id === activeTab && ["home", "scanner", "best", "profile"].includes(id) && path.split("/").length <= 2 && path === "/" + id);
    const lock = tier === "elite" && p !== "elite" ? `<span class="tag gold">Elite</span>` : "";
    return `<a href="${href}" class="${on ? "on" : ""}">${ic}<span>${label}</span>${lock}</a>`;
  }).join("")).join("");
  const u = session.user;
  $("#side-foot").innerHTML = u
    ? `<div class="panel" style="padding:12px"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.name || u.email)}</b><span class="plan-badge ${p}">${p[0].toUpperCase() + p.slice(1)}</span></div>${p === "free" ? `<a class="btn btn-gold btn-sm btn-block" style="margin-top:10px" href="#/upgrade">Upgrade</a>` : ""}</div>`
    : `<div class="panel" style="padding:12px"><b style="font-size:14px">Free account</b><p class="note" style="margin:4px 0 10px">Save alerts, chat and collect coins.</p><a class="btn btn-gold btn-sm btn-block" href="#/signup">Sign up free</a><a class="btn btn-quiet btn-sm btn-block" href="#/login">Log in</a></div>`;
}
function setTop({ title = "Alice", sub = "", actions = null, back: showBack = false } = {}) {
  $("#top-title").textContent = title;
  $("#top-sub").textContent = sub || "";
  document.title = title + " | Alice web app";
  const b = $("#back-btn");
  b.hidden = !showBack; b.innerHTML = icon.back;
  const coins = session.user ? `<a class="coin-pill" href="#/rewards" title="Your coins">${icon.coin}${int(session.user.coins || 0)}</a>` : "";
  const alertsBtn = `<a class="icon-btn" href="#/alerts" aria-label="Alerts">${icon.bell}${unseenAlerts ? '<span class="dot"></span>' : ""}</a>`;
  $("#top-actions").innerHTML = actions != null ? String(actions) : (session.user ? coins + alertsBtn : `<a class="btn btn-gold btn-sm" href="#/signup">Sign up free</a>`);
}
$("#back-btn").addEventListener("click", () => back());

/* ------------------------------------------------------------------ router */
let current = null, rendering = 0;
async function render() {
  const { path, query } = parseHash();
  // keep an in-app history stack for the Back button
  if (navStack.length > 1 && navStack[navStack.length - 2] === path) navStack.pop();
  else if (navStack[navStack.length - 1] !== path) navStack.push(path);
  const m = match(path);
  const view = $("#view");
  if (!m) { go("/home"); return; }
  const { r, params } = m;
  if (r.opts.auth && !session.loggedIn) { go("/login?next=" + encodeURIComponent(location.hash.slice(1))); return; }
  if (current) current.destroy();
  const ticket = ++rendering;
  drawShell(r.opts.tab, path);
  setTop({ title: "Alice", back: !!r.opts.back });
  document.body.classList.toggle("bare", !!r.opts.bare);
  const ctx = makeCtx(view, params, query, (o) => setTop({ back: !!r.opts.back, ...o }));
  current = ctx;
  try {
    const mod = await r.loader();
    if (ticket !== rendering) return;
    const fn = r.opts.fn ? mod[r.opts.fn] : mod.default;
    view.scrollTop = 0; window.scrollTo(0, 0);
    await fn(ctx);
  } catch (e) {
    console.error(e);
    if (ticket === rendering) view.innerHTML = String(errorBox({ message: "This screen could not be loaded. Check your connection and try again." }));
  }
  updateAd();
}
window.addEventListener("hashchange", render);
on("route", render);
on("auth", () => { toast("Please log in again"); go("/login"); });
on("user", () => { const { path } = parseHash(); const m = match(path); if (m) drawShell(m.r.opts.tab, path); });
document.addEventListener("click", (e) => { const t = e.target.closest("[data-retry]"); if (t) render(); });

/* ------------------------------------------------------------------ ads (free users only, never Premium/Elite) */
function updateAd() {
  const slot = (A.slots && A.slots.app) || "";
  const box = $("#app-ad");
  const ads = session.config && session.config.ads;
  const show = slot && !isPaid() && !(ads && ads.enabled === false) && !document.body.classList.contains("bare");
  if (!show) { box.hidden = true; box.innerHTML = ""; return; }
  if (!box.dataset.filled) {
    box.innerHTML = slot;
    box.querySelectorAll("script").forEach((old) => {   // scripts inserted with innerHTML don't run, so recreate them
      const s = document.createElement("script");
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      s.text = old.text; old.replaceWith(s);
    });
    box.dataset.filled = "1";
  }
  box.hidden = false;
}

/* ------------------------------------------------------------------ alerts that fire while the app is open */
let unseenAlerts = store.get("unseenAlerts", 0);
async function pollAlerts() {
  if (!session.loggedIn || document.hidden) return;
  try {
    let lastId = store.get("alertsLastId", null);
    if (lastId == null) {             // first run on this browser: start from the newest event, don't replay old ones
      const all = await api("/api/alerts");
      lastId = Math.max(0, ...(all.events || []).map((e) => e.id));
      store.set("alertsLastId", lastId);
      return;
    }
    const r = await api("/api/alerts/events?since=" + lastId);
    const ev = r.events || [];
    if (!ev.length) return;
    store.set("alertsLastId", Math.max(...ev.map((e) => e.id)));
    unseenAlerts += ev.length; store.set("unseenAlerts", unseenAlerts);
    const e = ev[ev.length - 1];
    toast("🔔 " + (e.title || "Alert triggered"), 5000);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(e.title || "Alice alert", { body: e.body || "", icon: A.base + "static/img/icons/icon-192.png", tag: "alice-alert-" + e.id }); } catch { }
    }
    const { path } = parseHash(); const m = match(path); if (m) setTop({ title: $("#top-title").textContent, sub: $("#top-sub").textContent, back: !!m.r.opts.back });
  } catch { /* offline */ }
}
on("alerts-seen", () => { unseenAlerts = 0; store.set("unseenAlerts", 0); });

/* ------------------------------------------------------------------ iPhone: "Add to Home Screen" tip */
function iosHint() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  if (!ios || standalone || store.get("iosHintDone")) return;
  const seen = store.get("iosHintSeen", 0);
  if (seen >= 3) return;
  store.set("iosHintSeen", seen + 1);
  const d = document.createElement("div");
  d.className = "ios-hint";
  d.innerHTML = `<button class="icon-btn x" aria-label="Close">${icon.x}</button><b>Install Alice on your iPhone</b>
    <ol class="ios-steps"><li><span>Tap the Share button ${icon.share} in Safari</span></li><li><span>Choose <b style="display:inline">Add to Home Screen</b></span></li><li><span>Open Alice from its new icon, full screen</span></li></ol>`;
  d.querySelector(".x").onclick = () => { d.remove(); store.set("iosHintDone", true); };
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 20000);
}

/* ------------------------------------------------------------------ start */
(async function start() {
  if (!location.hash) history.replaceState(null, "", "#/home");
  // referral links: /app/?ref=CODE or #/signup?ref=CODE
  const ref = new URLSearchParams(location.search).get("ref");
  if (ref) store.set("ref", ref.toUpperCase().slice(0, 12));
  await Promise.race([loadConfig(), new Promise((r) => setTimeout(r, 2500))]);
  render();
  if (session.loggedIn) {
    refreshMe().then(() => { const { path } = parseHash(); const m = match(path); if (m) drawShell(m.r.opts.tab, path); updateAd(); });
    api("/api/me/device", { method: "POST", body: { fcm_token: "", flavor: "web", app_version: "web-" + (A.v || "") } }).catch(() => {});
  }
  setInterval(() => loadConfig(true).then(updateAd), 180000);
  setInterval(pollAlerts, 60000); setTimeout(pollAlerts, 8000);
  setTimeout(iosHint, 6000);
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register(A.base + "sw.js").catch(() => {});
})();
