/* Pop-ups like the Android app: announcements and offers, plan expiry, discussion-room invite,
   and a friendly request to turn on notifications. Each one is shown rarely and never twice for the same thing. */
import { html, esc, api, session, plan, store, sheet, icon, toMs, parseHash } from "./core.js";
import * as push from "./push.js";

const DAY = 864e5;
let open = false;
function show(content, label) {
  if (open || document.querySelector(".sheet-bg, .ist") || document.body.classList.contains("bare")) return null;
  if (/^\/(pay|upgrade|signup|login|forgot|spin|edit-profile|password|delete)/.test(parseHash().path)) return null;   // never interrupt a task
  open = true;
  const s = sheet(content, { label, onClose: () => { open = false; } });
  s.el.classList.add("popup");
  s.el.querySelectorAll("a[href^='#']").forEach((a) => a.addEventListener("click", () => s.close()));
  return s;
}

/** Newest announcement or offer broadcast (last 3 days) that this browser hasn't seen. */
async function announcement() {
  try {
    const r = await api("/api/announcements?client=web", { auth: false });
    const seen = store.get("annSeen", 0);
    const n = (r.items || []).find((x) => x.kind !== "brief" && x.id > seen && toMs(x.created_at) > Date.now() - 3 * DAY);
    if (!n) { const top = Math.max(seen, ...(r.items || []).map((x) => x.id)); store.set("annSeen", top); return false; }
    const isOffer = /^offer/.test(n.kind);
    const s = show(`<div class="pop-center"><div class="pop-emo">${isOffer ? "🔥" : "📢"}</div><h2>${esc(n.title)}</h2><p class="muted" style="white-space:pre-line">${esc(n.body)}</p>
      <div class="btn-row" style="justify-content:center">${isOffer ? `<a class="btn btn-gold" href="#/upgrade">See the offer</a>` : `<a class="btn btn-gold" href="#/home">OK</a>`}</div></div>`, "Announcement");
    if (s) store.set("annSeen", n.id);
    return !!s;
  } catch { return false; }
}

/** Premium / Elite ending in 3 days or 1 day. */
function expiry() {
  const u = session.user; const p = plan();
  if (!u || p === "free") return false;
  const left = toMs(u.plan_expires_at) - Date.now();
  if (!(left > 0 && left < 3 * DAY)) return false;
  const stage = left < DAY ? "1" : "3";
  const key = "expPop:" + u.plan_expires_at + ":" + stage;
  if (store.get(key)) return false;
  const name = p === "elite" ? "Elite" : "Premium";
  const s = show(`<div class="pop-center"><div class="pop-emo">⏳</div><h2>Your ${name} ends ${stage === "1" ? "tomorrow" : "in 3 days"}</h2>
    <p class="muted">Renew now to keep every ${name} feature without a break. Coins can pay for it too.</p>
    <div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="#/upgrade?plan=${p}">Renew ${name}</a><a class="btn btn-line" href="#/rewards">Use my coins</a></div></div>`, "Plan ending");
  if (s) store.set(key, 1);
  return !!s;
}

/** Every 12 hours: invite to the busy discussion room. */
async function chatInvite() {
  if (Date.now() - store.get("chatInviteAt", 0) < 12 * 3600e3) return false;
  if (parseHash().path.startsWith("/chat")) return false;
  try {
    const room = Math.random() < 0.6 ? "crypto" : "forex";
    const r = await api("/api/chat/" + room + "?peek=1", { auth: false });
    const hot = (r.trending || []).map((t) => t.symbol).join(", ");
    const s = show(`<div class="pop-center"><div class="pop-emo">💬</div><h2>${room === "crypto" ? "Crypto traders are talking" : "Forex and gold traders are talking"}</h2>
      <p class="muted">${hot ? "Hot right now: " + esc(hot) + ". " : ""}Join the live discussion room and share your view.</p>
      <div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="#/chat/${room}">Join the room</a></div></div>`, "Discussion room");
    if (s) store.set("chatInviteAt", Date.now());
    return !!s;
  } catch { return false; }
}

/** Soft ask before the browser's own permission prompt (browsers block prompts that appear without a click). */
function pushAsk() {
  if (push.enabled() || push.permission() === "denied" || push.support() === "unsupported" || push.support() === "insecure") return false;
  if (Date.now() - store.get("pushAskAt", 0) < 3 * DAY) return false;
  const ios = push.support() === "ios-install";
  const s = show(`<div class="pop-center"><div class="pop-emo bell">${icon.bell}</div><h2>Never miss a move</h2>
    <p class="muted">Get your price alerts, chat replies, breaking news and offers as notifications on this ${/Mobi|Android|iPhone/.test(navigator.userAgent) ? "phone" : "computer"}, even when Alice is closed.</p>
    ${ios ? `<p class="note">On iPhone: tap Share, then Add to Home Screen, then turn notifications on inside the Alice icon.</p>` : ""}
    <div class="btn-row" style="justify-content:center"><button class="btn btn-gold" data-yes type="button">${ios ? "Show me how" : "Turn on notifications"}</button><button class="btn btn-quiet" data-no type="button">Later</button></div></div>`, "Notifications");
  if (!s) return false;
  store.set("pushAskAt", Date.now());
  s.el.querySelector("[data-no]").onclick = () => s.close();
  s.el.querySelector("[data-yes]").onclick = async () => {
    s.close();
    if (ios) { location.hash = "#/notifications"; return; }
    try { await push.enable(); const { toast } = await import("./core.js"); toast("Notifications are on 🎉"); }
    catch (e) { location.hash = "#/notifications"; }
  };
  return true;
}

/** One pop-up at most per check, in order of importance. */
export async function check() {
  if (document.hidden) return;
  if (expiry()) return;
  if (await announcement()) return;
  if (pushAsk()) return;
  if (session.loggedIn) await chatInvite();
}
export function start() {
  store.set("visits", store.get("visits", 0) + 1);
  setTimeout(check, 15000);
  setInterval(check, 10 * 60000);
}
