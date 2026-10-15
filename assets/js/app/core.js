/* Core of the Alice web app: server calls, session, HTML helpers, formatting, UI helpers and the router. */
export const A = window.ALICE || {};
export const API = (A.api || "").replace(/\/$/, "");

/* ------------------------------------------------------------------ safe storage */
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem("alice." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("alice." + k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem("alice." + k); } catch { } },
};

/* ------------------------------------------------------------------ html helpers */
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s == null ? "" : String(s));
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function val(v) {
  if (v == null || v === false) return "";
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(val).join("");
  return esc(v);
}
/** Tagged template: escapes every value unless it is raw() or another html`` result. */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += val(values[i]) + strings[i + 1];
  return new Raw(out);
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ------------------------------------------------------------------ formatting */
export const toMs = (t) => (!t ? 0 : t < 1e12 ? t * 1000 : t);
export function price(p, market, symbol) {
  if (p == null || !isFinite(p)) return "--";
  let d;
  if (market === "forex") d = /JPY|HUF|KRW|IDR|INR|PKR|PHP|THB|CZK|TRY|MXN|ZAR|NOK|SEK|DKK|CNH|HKD/.test(String(symbol || "").slice(3)) ? 3 : 5;
  else { const a = Math.abs(p); d = a >= 1000 ? 2 : a >= 100 ? 2 : a >= 1 ? 4 : a >= 0.01 ? 5 : 8; }
  return Number(p).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export const num = (v, d = 2) => (v == null || !isFinite(v) ? "--" : Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
export const int = (v) => (v == null || !isFinite(v) ? "--" : Math.round(v).toLocaleString("en-US"));
export const pct = (v, d = 2) => (v == null || !isFinite(v) ? "--" : (v >= 0 ? "+" : "") + Number(v).toFixed(d) + "%");
export const usd = (v, d = 2) => (v == null || !isFinite(v) ? "--" : (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
export function compact(v) {
  if (v == null || !isFinite(v)) return "--";
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2) + "B"; if (a >= 1e6) return (v / 1e6).toFixed(2) + "M"; if (a >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(0);
}
export const upDown = (v) => (v >= 0 ? "up" : "down");
export function ago(t) {
  const ms = toMs(t); if (!ms) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago"; return Math.floor(s / 86400) + " d ago";
}
export function dateTime(t, opts) {
  const ms = toMs(t); if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, opts || { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export const date = (t) => dateTime(t, { day: "numeric", month: "short", year: "numeric" });
export function untilText(ms) {
  let s = Math.max(0, Math.floor((toMs(ms) - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
  const p = (x) => String(x).padStart(2, "0");
  return (d ? d + "d " : "") + p(h) + ":" + p(m) + ":" + p(s);
}
export const scoreCls = (s) => (s >= 65 ? "s-bull" : s <= 35 ? "s-bear" : "s-neutral");
export const scoreHtml = (s) => {
  s = Math.round(s || 0);
  return html`<span class="score ${scoreCls(s)}" aria-label="Score ${s} of 100"><b>${s}</b><span class="track"><i style="left:${Math.max(2, Math.min(98, s))}%"></i></span></span>`;
};
export const sideTag = (side) => {
  const s = String(side || "").toUpperCase();
  const bull = s === "BUY" || s === "LONG" || s === "BULLISH";
  const bear = s === "SELL" || s === "SHORT" || s === "BEARISH";
  return html`<span class="tag ${bull ? "bull" : bear ? "bear" : ""}">${s || "--"}</span>`;
};
export const labelTag = (label) => {
  const l = String(label || "").toLowerCase();
  return html`<span class="tag ${l.includes("bull") ? "bull" : l.includes("bear") ? "bear" : "gold"}">${label}</span>`;
};

/* ------------------------------------------------------------------ server calls */
export class ApiError extends Error {
  constructor(status, message, code, extra) { super(message); this.status = status; this.code = code; this.extra = extra || {}; }
}
export async function api(path, { method = "GET", body, form, auth = true, timeout = 25000 } = {}) {
  const headers = { Accept: "application/json" };
  const token = session.token;
  if (auth && token) headers.Authorization = "Bearer " + token;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(API + path, { method, headers, body: payload, signal: ctl.signal });
  } catch (e) {
    throw new ApiError(0, navigator.onLine === false ? "You're offline. Check your internet connection." : "Can't reach the Alice server right now. Please try again in a moment.", "network");
  } finally { clearTimeout(timer); }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = (data && data.error) || "Something went wrong (" + res.status + ")";
    const code = (data && data.code) || "http";
    if (res.status === 401 && token && (code === "auth_expired" || code === "auth_required")) { session.clear(); emit("auth"); }
    const extra = {}; if (data) for (const k in data) if (k !== "error" && k !== "code") extra[k] = data[k];
    throw new ApiError(res.status, msg, code, extra);
  }
  return data;
}
/** Simple cache for GETs that many screens use (config, overview). */
const cache = new Map();
export async function cached(path, ttlMs = 60000, opts) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await api(path, opts);
  cache.set(path, { t: Date.now(), v });
  return v;
}
export const dropCache = (prefix) => { for (const k of cache.keys()) if (!prefix || k.startsWith(prefix)) cache.delete(k); };

/* ------------------------------------------------------------------ events */
const listeners = {};
export const on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
export const emit = (ev, data) => (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

/* ------------------------------------------------------------------ session */
export const session = {
  token: store.get("token"),
  user: store.get("user"),
  config: store.get("config"),
  get loggedIn() { return !!this.token; },
  set(token, user) { this.token = token; this.user = user; store.set("token", token); store.set("user", user); emit("user", user); },
  setUser(user) { this.user = user; store.set("user", user); emit("user", user); },
  clear() { this.token = null; this.user = null; store.del("token"); store.del("user"); dropCache(); emit("user", null); },
};
const RANK = { free: 0, premium: 1, elite: 2 };
export function plan() {
  const u = session.user;
  if (!u || !u.plan || u.plan === "free") return "free";
  const exp = toMs(u.plan_expires_at);
  return exp && exp < Date.now() ? "free" : u.plan;
}
export const atLeast = (tier) => RANK[plan()] >= RANK[tier];
export const isPaid = () => plan() !== "free";
export async function refreshMe() {
  if (!session.token) return null;
  try { const r = await api("/api/me"); session.setUser(r.user); return r.user; } catch (e) { return null; }
}
export async function loadConfig(force) {
  try {
    const c = force ? await api("/api/config", { auth: false }) : await cached("/api/config", 180000, { auth: false });
    session.config = c; store.set("config", c); emit("config", c); return c;
  } catch { return session.config; }
}

/* ------------------------------------------------------------------ icons */
const I = (d, extra = "") => raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`);
export const icon = {
  home: I('<path d="M3 11 12 3l9 8M5 9.5V21h5v-6h4v6h5V9.5"/>'),
  radar: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/>'),
  trophy: I('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  grid: I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  back: I('<path d="M15 18 9 12l6-6"/>'),
  chev: I('<path d="m9 18 6-6-6-6"/>'),
  bell: I('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  chat: I('<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>'),
  news: I('<path d="M4 4h13v16H6a2 2 0 0 1-2-2V4zM17 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3"/>'),
  cal: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  book: I('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5"/>'),
  coin: I('<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5A2.5 2.5 0 0 0 12 8h-.5a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4H12a2.5 2.5 0 0 1-2.5-1.5M12 6v2M12 16v2"/>'),
  gold: I('<path d="M3 18h7l-1.5-5h-4zM14 18h7l-1.5-5h-4zM8.5 11h7L14 6h-4z"/>'),
  btc: I('<path d="M9 7h5a2.5 2.5 0 0 1 0 5H9h6a2.5 2.5 0 0 1 0 5H9V7zM10 4v3M14 4v3M10 17v3M14 17v3"/>'),
  ai: I('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9z"/>'),
  whale: I('<path d="M2 13c2 4 6 6 11 6 4 0 7-2 8-5l1-3-3 1c-1-3-4-5-8-5-5 0-8 3-9 6z"/><path d="M16 11h.01"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  calc: I('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h4"/>'),
  journal: I('<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2M9 8h6M9 12h6"/>'),
  wallet: I('<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 0 2-3h12v3M16 13.5h.01"/>'),
  swap: I('<path d="M7 7h13l-4-4M17 17H4l4 4"/>'),
  fib: I('<path d="M3 6h18M3 10h18M3 14h18M3 18h18M7 3v18"/>'),
  strength: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  funding: I('<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>'),
  bank: I('<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>'),
  story: I('<path d="M12 6c-2-2-6-2-9-1v14c3-1 7-1 9 1 2-2 6-2 9-1V5c-3-1-7-1-9 1zM12 6v14"/>'),
  gift: I('<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8S10 3 7.5 4 8 8 12 8zm0 0s2-5 4.5-4S16 8 12 8z"/>'),
  wheel: I('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>'),
  crown: I('<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>'),
  card: I('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'),
  lock: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  check: I('<path d="M20 6 9 17l-5-5"/>'),
  x: I('<path d="M18 6 6 18M6 6l12 12"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  ext: I('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  share: I('<path d="M12 3v12M7 8l5-5 5 5"/><rect x="4" y="11" width="16" height="10" rx="2"/>'),
  download: I('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  logout: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  telegram: I('<path d="m22 3-20 8 7 2.5M22 3l-4 18-9-7.5M22 3 9 13.5v6l3.5-4"/>'),
  globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  fire: I('<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z"/>'),
};

/* ------------------------------------------------------------------ UI helpers */
let toastTimer;
export function toast(msg, ms = 2600) {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}
export function sheet(content, { onClose, label = "Dialog" } = {}) {
  const root = $("#sheet-root");
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="icon-btn x" type="button" aria-label="Close">${icon.x}</button>${content}</div>`;
  const prev = document.activeElement;
  const close = () => { bg.remove(); document.removeEventListener("keydown", key); if (onClose) onClose(); if (prev && prev.focus) prev.focus(); };
  const key = (e) => { if (e.key === "Escape") close(); };
  bg.addEventListener("click", (e) => { if (e.target === bg) close(); });
  bg.querySelector(".x").addEventListener("click", close);
  document.addEventListener("keydown", key);
  root.appendChild(bg);
  const f = bg.querySelector("input,button:not(.x),a"); if (f) setTimeout(() => f.focus(), 30);
  return { el: bg.querySelector(".sheet"), close };
}
export function confirmSheet(title, text, okLabel = "Confirm", danger = false) {
  return new Promise((resolve) => {
    let done = false;
    const s = sheet(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><div class="btn-row" style="margin-top:16px"><button class="btn ${danger ? "btn-line" : "btn-gold"}" data-ok style="${danger ? "color:var(--bear);border-color:var(--bear)" : ""}">${esc(okLabel)}</button><button class="btn btn-line" data-no>Cancel</button></div>`,
      { onClose: () => { if (!done) resolve(false); } });
    s.el.querySelector("[data-ok]").onclick = () => { done = true; s.close(); resolve(true); };
    s.el.querySelector("[data-no]").onclick = () => { done = true; s.close(); resolve(false); };
  });
}
export async function copy(text, msg = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(msg); } catch { toast("Copy failed, select the text manually"); }
    ta.remove();
  }
}
export async function shareText(text, url) {
  if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { /* cancelled */ } }
  copy(text + (url ? " " + url : ""), "Copied to clipboard");
}
export const skeleton = (n = 4, h = 52) => raw(Array.from({ length: n }, () => `<div class="skel" style="height:${h}px;margin-top:10px"></div>`).join(""));
export const errorBox = (e, retry = true) => html`<div class="empty"><b>${e && e.code === "network" ? "Can't connect" : "Something went wrong"}</b>${e ? e.message : ""}${retry ? html`<div><button class="btn btn-line btn-sm" data-retry>Try again</button></div>` : ""}</div>`;
export const emptyBox = (title, text, btn) => html`<div class="empty"><b>${title}</b>${text}${btn ? html`<div>${btn}</div>` : ""}</div>`;
export function featList(items) { return html`<ul class="feat-list">${items.map((x) => html`<li>${icon.check}<span>${x}</span></li>`)}</ul>`; }

/** Shown instead of a feature that needs a higher plan. */
export function gate(tier, title, text, perks) {
  const t = tier === "elite" ? "Elite" : "Premium";
  const loggedIn = session.loggedIn;
  return html`<div class="gate">
    <div class="emo">${tier === "elite" ? "👑" : "⭐"}</div>
    <h2>${title}</h2><p>${text}</p>
    ${perks && perks.length ? featList(perks) : ""}
    <div class="btn-row" style="justify-content:center">
      ${loggedIn ? html`<a class="btn btn-gold" href="#/upgrade?plan=${tier}">Upgrade to ${t}</a>` : html`<a class="btn btn-gold" href="#/signup">Create a free account</a><a class="btn btn-line" href="#/login">Log in</a>`}
    </div>
    ${loggedIn ? html`<p class="note" style="margin-top:12px">Or earn ${t} free with coins: <a href="#/rewards">Spin and invite friends</a></p>` : ""}
  </div>`;
}
export function needLogin(what) {
  return html`<div class="gate"><div class="emo">🔐</div><h2>Log in to use ${what}</h2>
    <p>It's free. Your account works on the website, Android and iPhone.</p>
    <div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="#/signup">Create a free account</a><a class="btn btn-line" href="#/login">Log in</a></div></div>`;
}

/* ------------------------------------------------------------------ router */
const routes = [];
export function route(pattern, loader, opts = {}) {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$");
  routes.push({ re, keys, loader, opts });
}
export function parseHash() {
  const h = (location.hash || "#/home").slice(1) || "/home";
  const [path, qs] = h.split("?");
  const query = Object.fromEntries(new URLSearchParams(qs || ""));
  return { path: path || "/home", query };
}
export function match(path) {
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) { const params = {}; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); return { r, params }; }
  }
  return null;
}
export function go(path) { if (location.hash !== "#" + path) location.hash = path; else emit("route"); }
/** In-app history so "Back" never leaves the app. main.js records every visited path here. */
export const navStack = [];
export function back(fallback = "/home") {
  if (navStack.length > 1) history.back();
  else go(fallback);
}
export const qs = (obj) => { const s = new URLSearchParams(Object.entries(obj).filter(([, v]) => v != null && v !== "")).toString(); return s ? "?" + s : ""; };

/* ------------------------------------------------------------------ screen context */
/** Each screen gets `ctx`: set the top bar, render HTML, register timers that stop when you leave. */
export function makeCtx(view, params, query, setTop) {
  const timers = [], cleanups = [];
  let alive = true;
  const ctx = {
    params, query, view,
    get alive() { return alive; },
    top: setTop,
    render(h) { if (alive) view.innerHTML = String(h); },
    every(ms, fn) { const id = setInterval(() => { if (alive && !document.hidden) fn(); }, ms); timers.push(id); return id; },
    later(ms, fn) { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; },
    cleanup(fn) { cleanups.push(fn); },
    on(sel, ev, fn) {
      const h = (e) => { const t = e.target.closest(sel); if (t && view.contains(t)) fn(e, t); };
      view.addEventListener(ev, h); cleanups.push(() => view.removeEventListener(ev, h));
    },
    destroy() { alive = false; timers.forEach((t) => { clearInterval(t); clearTimeout(t); }); cleanups.forEach((f) => { try { f(); } catch { } }); },
  };
  return ctx;
}
