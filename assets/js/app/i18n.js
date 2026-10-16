/* Languages: the same 10 as the Android app. The UI is written in English; every text that appears on screen
   is translated automatically from assets/i18n/<lang>.json (exact sentences + patterns with {placeholders}).
   Content from the server (analyses, lessons, chat, news) stays as it is. Mark such areas with data-notr. */
import { A, store } from "./core.js";

export const LANGS = [
  ["en", "English"], ["ur", "اردو"], ["hi", "हिन्दी"], ["ar", "العربية"], ["zh", "中文"],
  ["es", "Español"], ["pt", "Português"], ["fr", "Français"], ["ru", "Русский"], ["tr", "Türkçe"],
];
const RTL = new Set(["ar", "ur"]);
const FONTS = {
  ur: "Noto+Nastaliq+Urdu:wght@400;600;700", ar: "Noto+Sans+Arabic:wght@400;600;700",
  hi: "Noto+Sans+Devanagari:wght@400;600;700", zh: "Noto+Sans+SC:wght@400;600;700",
};

function detect() {
  const saved = store.get("lang");
  if (saved && LANGS.some((l) => l[0] === saved)) return saved;
  const q = new URLSearchParams(location.search).get("lang");
  if (q && LANGS.some((l) => l[0] === q)) { store.set("lang", q); return q; }
  for (const n of navigator.languages || [navigator.language || "en"]) {
    const c = String(n).slice(0, 2).toLowerCase();
    if (LANGS.some((l) => l[0] === c)) return c;
  }
  return "en";
}

export let lang = detect();
let exact = {}, patterns = [];

function compile(dict) {
  exact = dict.exact || {};
  patterns = Object.entries(dict.patterns || {}).map(([k, v]) => {
    const names = [];
    const re = new RegExp("^" + k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, (_, n) => { names.push(n); return "(.+?)"; }) + "$");
    return { re, names, out: v };
  });
}

/** Translate one string: exact sentence, else the first matching pattern (its {parts} are translated too). */
function tr(key, depth) {
  if (exact[key] != null) return exact[key];
  if (depth > 2) return null;
  for (const p of patterns) {
    const m = key.match(p.re);
    if (m) {
      let r = p.out;
      p.names.forEach((n, i) => { const g = m[i + 1]; const x = tr(g.trim(), depth + 1); r = r.split("{" + n + "}").join(x != null ? x : g); });
      return r;
    }
  }
  return null;
}
export function t(s, vars) {
  if (s == null) return "";
  let out = String(s);
  if (lang !== "en") {
    const key = out.trim();
    const r = key && tr(key, 0);
    if (r != null) out = out.replace(key, r);
  }
  if (vars) for (const k in vars) out = out.split("{" + k + "}").join(vars[k]);
  return out;
}

const SKIP = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "CANVAS", "SVG", "svg", "NOSCRIPT"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const NOTR = "[data-notr],.prose-sm,.msg,.lesson-body";
const noTr = (el) => el.matches && el.matches(NOTR);
function translateNode(root) {
  if (lang === "en" || !root) return;
  if (root.nodeType === 3) { if (!(root.parentElement && root.parentElement.closest(NOTR))) tText(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName) || (root.closest && root.closest(NOTR))) return;
  tAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        if (SKIP.has(n.nodeName) || noTr(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  const texts = [];
  while ((n = walker.nextNode())) texts.push(n);
  texts.forEach(tText);
  root.querySelectorAll && root.querySelectorAll("[placeholder],[aria-label],[title],img[alt],input[type=submit],input[type=button]").forEach((el) => { if (!el.closest(NOTR)) tAttrs(el); });
}
function tText(n) {
  const v = n.nodeValue;
  if (!v || !v.trim() || n.__t === v) return;
  const r = t(v);
  n.__t = r;
  if (r !== v) n.nodeValue = r;
}
function tAttrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute && el.getAttribute(a);
    if (v && v.trim()) { const r = t(v); if (r !== v) el.setAttribute(a, r); }
  }
  if (el.tagName === "INPUT" && (el.type === "submit" || el.type === "button") && el.value) el.value = t(el.value);
}

let observer = null;
function observe() {
  if (observer) observer.disconnect();
  if (lang === "en") return;
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "childList") m.addedNodes.forEach(translateNode);
      else if (m.type === "attributes") tAttrs(m.target);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title"] });
}

function applyDocument() {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.has(lang) ? "rtl" : "ltr";
  const f = FONTS[lang];
  const id = "lang-font";
  let link = document.getElementById(id);
  if (f) {
    if (!link) { link = document.createElement("link"); link.id = id; link.rel = "stylesheet"; document.head.appendChild(link); }
    link.href = "https://fonts.googleapis.com/css2?family=" + f + "&display=swap";
  } else if (link) link.remove();
  document.body.dataset.lang = lang;
}

export async function loadLang(l = lang) {
  lang = l;
  applyDocument();
  if (l === "en") { exact = {}; patterns = []; observe(); return; }
  try {
    const r = await fetch((A.base || "/") + "assets/i18n/" + l + ".json?v=" + (A.v || ""));
    compile(await r.json());
  } catch { exact = {}; patterns = []; }
  observe();
  translateNode(document.body);
}

export async function setLang(l) {
  store.set("lang", l);
  await loadLang(l);
}
export const isRtl = () => RTL.has(lang);
export const translateNow = translateNode;
