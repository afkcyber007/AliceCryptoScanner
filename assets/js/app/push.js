/* Web Push: notifications on Windows, Mac, Android and iPhone (iOS 16.4+ after "Add to Home Screen"),
   even when the website is closed. The Alice server sends them (alerts, chat rooms, news, whale activity, plan reminders). */
import { A, api, session, store, emit } from "./core.js";
import { lang } from "./i18n.js";

export const DEFAULT_PREFS = {
  alerts: true, account: true, announcements: true, brief: true, news: true, listings: true, activity: true,
  chat_crypto: false, chat_forex: false, chat_invite: true, activity_side: "all", activity_kinds: ["whale", "ready", "flow", "moves"],
};
export const prefs = () => ({ ...DEFAULT_PREFS, ...store.get("pushPrefs", {}) });
export const savePrefs = (p) => store.set("pushPrefs", p);

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;

/** "ok" | "ios-install" (iPhone needs Home Screen) | "unsupported" | "insecure" */
export function support() {
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return "insecure";
  if (isIOS() && !standalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}
export const permission = () => ("Notification" in window ? Notification.permission : "denied");
export const enabled = () => store.get("pushOn", false) && permission() === "granted";

function b64ToBytes(b64) {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s); const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
async function registration() {
  let reg = await navigator.serviceWorker.getRegistration(A.base);
  if (!reg) reg = await navigator.serviceWorker.register(A.base + "sw.js");
  return navigator.serviceWorker.ready.then(() => reg);
}

/** Asks the browser for permission (only call from a click) and registers with the Alice server. */
export async function enable() {
  const sup = support();
  if (sup !== "ok") throw new Error(sup === "ios-install" ? "On iPhone, first add Alice to your Home Screen, then open it from the icon and turn notifications on." : sup === "insecure" ? "Notifications need the secure (https) website." : "This browser does not support notifications. Try Chrome, Edge, Firefox or Safari.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error(perm === "denied" ? "Notifications are blocked. Allow them in your browser settings (the lock icon next to the address), then try again." : "Notifications were not allowed.");
  await subscribe();
  store.set("pushOn", true);
  emit("push", true);
}

/** Registers (or refreshes) this browser's subscription and preferences on the server. */
export async function subscribe() {
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  const { key } = await api("/api/push/key", { auth: false });
  if (sub) {
    const cur = sub.options && sub.options.applicationServerKey;
    if (cur) {
      const a = new Uint8Array(cur), b = b64ToBytes(key);
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) { await sub.unsubscribe(); sub = null; }
    }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
  const j = sub.toJSON();
  await api("/api/push/subscribe", { method: "POST", auth: !!session.token, body: { subscription: { endpoint: j.endpoint, keys: j.keys }, prefs: prefs(), lang } });
  store.set("pushEndpoint", j.endpoint);
  return j.endpoint;
}

export async function disable() {
  try {
    const reg = await navigator.serviceWorker.getRegistration(A.base);
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) {
      await api("/api/push/unsubscribe", { method: "POST", auth: false, body: { endpoint: sub.endpoint } }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch { /* already gone */ }
  store.set("pushOn", false);
  emit("push", false);
}

export async function test() {
  const ep = store.get("pushEndpoint") || (await subscribe());
  return api("/api/push/test", { method: "POST", auth: false, body: { endpoint: ep } });
}

/** Keep the server copy in sync (login, logout, language change, renewed subscription). */
let lastSync = { key: "", at: 0 };
export async function resync(force) {
  if (!enabled() || support() !== "ok") return;
  const key = (session.token || "") + "|" + lang;
  if (!force && key === lastSync.key && Date.now() - lastSync.at < 30 * 60000) return;
  lastSync = { key, at: Date.now() };
  try { await subscribe(); } catch { lastSync.at = 0; /* offline, try next time */ }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.type === "resubscribe") resync(true); });
}
