/* Notification settings: the same choices as the Android app, delivered as browser notifications. */
import { html, raw, session, plan, toast, icon, store } from "../core.js";
import * as push from "../push.js";

const GROUPS = [
  ["Your account", [
    ["alerts", "🔔", "My alerts", "Price, RSI, breakout and trend alerts you created"],
    ["account", "👤", "Plan and payments", "Payment approved, plan activated, expiry reminders"],
  ]],
  ["Market", [
    ["brief", "☀️", "Daily market brief", "Morning and evening outlook"],
    ["news", "📰", "Breaking news", "High-impact forex, gold and crypto headlines"],
    ["listings", "🆕", "New listings", "New coins on the big exchanges"],
    ["announcements", "📣", "Offers and announcements", "Discounts, new features and important updates"],
  ]],
  ["Discussion rooms", [
    ["chat_crypto", "💬", "Crypto room messages", "A summary of new messages, at most every 10 minutes"],
    ["chat_forex", "💬", "Forex and gold room messages", "A summary of new messages, at most every 10 minutes"],
    ["chat_invite", "👋", "Room reminders", "A friendly invite when the rooms are busy"],
  ]],
];
const KINDS = [["whale", "🐋 Whale orders"], ["ready", "🚀 Ready to move"], ["flow", "💧 Money flow"], ["moves", "⚡ Pumps and dumps"]];

export default async function notifications(ctx) {
  ctx.top({ title: "Notifications", sub: "On this computer or phone, even when Alice is closed" });
  let busy = false;
  const draw = () => {
    const p = push.prefs(), on = push.enabled(), sup = push.support(), perm = push.permission(), elite = plan() === "elite";
    const sw = (k) => html`<label class="switch"><input type="checkbox" data-pref="${k}" ${p[k] ? raw("checked") : ""} ${on ? "" : raw("disabled")}><i></i></label>`;
    ctx.render(html`
      <section class="panel notify-hero ${on ? "on" : ""}">
        <div class="nh-ic">${icon.bell}</div>
        <div><h2>${on ? "Notifications are on" : "Turn on notifications"}</h2>
          <p class="muted">${on ? "Alice will notify you on this device, like the Android app does." : "Get your alerts, chat messages, news and plan reminders as real notifications on Windows, Mac, Android or iPhone."}</p></div>
        <div class="btn-row">${on ? html`<button class="btn btn-line btn-sm" data-test ${busy ? raw("disabled") : ""}>Send a test</button><button class="btn btn-quiet btn-sm" data-off>Turn off</button>`
          : html`<button class="btn btn-gold" data-on ${busy || sup === "unsupported" || sup === "insecure" ? raw("disabled") : ""}>${busy ? "Turning on…" : "Turn on notifications"}</button>`}</div>
      </section>
      ${sup === "ios-install" ? html`<section class="panel ios-box"><b>iPhone and iPad</b><p class="note mt0">Apple allows website notifications only for apps on the Home Screen (iOS 16.4 or newer):</p>
        <ol class="ios-steps"><li><span>Tap the Share button ${icon.share} in Safari</span></li><li><span>Choose <b style="display:inline">Add to Home Screen</b></span></li><li><span>Open Alice from the new icon and come back here</span></li></ol></section>` : ""}
      ${perm === "denied" ? html`<section class="panel warn-box"><b>Notifications are blocked in this browser</b><p class="note mt0">Click the lock icon next to the web address, set Notifications to Allow, then reload this page.</p></section>` : ""}
      ${!session.loggedIn ? html`<a class="banner upgrade" href="#/login?next=/notifications"><span class="emo">🔐</span><span><b>Log in for personal notifications</b><span class="muted">Your alerts and plan reminders need your account. Market news works without it.</span></span><span class="btn btn-gold btn-sm">Log in</span></a>` : ""}
      ${GROUPS.map(([g, items]) => html`<section class="panel"><div class="panel-head"><h2>${g}</h2></div><div class="list">
        ${items.map(([k, emo, name, desc]) => html`<div class="li"><span class="with-ic"><span class="lead-ic">${emo}</span><span><span class="t">${name}</span><span class="s">${desc}</span></span></span><span class="r">${sw(k)}</span></div>`)}</div></section>`)}
      <section class="panel"><div class="panel-head"><h2>🐋 Whale and unusual activity</h2>${elite ? "" : html`<span class="tag gold">🔒 Elite</span>`}</div>
        ${elite ? html`<div class="list"><div class="li"><span><span class="t">Activity notifications</span><span class="s">Big orders, pumps, dumps and coins ready to move</span></span><span class="r">${sw("activity")}</span></div></div>
          <div class="tabs small" style="margin-top:10px" role="group" aria-label="Side">${[["all", "Buy and sell"], ["buy", "Buy only"], ["sell", "Sell only"]].map(([v, l]) => html`<button type="button" data-side="${v}" aria-pressed="${p.activity_side === v}" ${on ? "" : raw("disabled")}>${l}</button>`)}</div>
          <div class="chips" style="margin-top:8px">${KINDS.map(([k, l]) => html`<label class="chip"><input type="checkbox" data-kind="${k}" ${p.activity_kinds.includes(k) ? raw("checked") : ""} ${on ? "" : raw("disabled")}> ${l}</label>`)}</div>`
          : html`<p class="note mt0">Elite members get instant notifications when whales buy or sell, money flows in, or a coin is ready to move.</p><button class="btn btn-gold btn-sm" data-unlock="elite" data-unlock-title="Whale activity notifications">Unlock with Elite</button>`}
      </section>
      <p class="note">Notifications go to this browser only. Turn them on in every browser or device you use. You can change these settings any time.</p>`);
  };
  const save = async (p) => { push.savePrefs(p); draw(); try { await push.subscribe(); toast("Saved"); } catch (e) { toast(e.message || "Could not save, check your connection"); } };
  ctx.on("[data-on]", "click", async () => {
    busy = true; draw();
    try { await push.enable(); toast("Notifications are on 🎉"); } catch (e) { toast(e.message, 6000); }
    busy = false; draw();
  });
  ctx.on("[data-off]", "click", async () => { await push.disable(); toast("Notifications are off"); draw(); });
  ctx.on("[data-test]", "click", async () => {
    busy = true; draw();
    try { const r = await push.test(); toast(r.sent ? "Test sent. It arrives in a few seconds." : "Could not send. Turn notifications off and on again."); } catch (e) { toast(e.message); }
    busy = false; draw();
  });
  ctx.on("[data-pref]", "change", (e, el) => { const p = push.prefs(); p[el.dataset.pref] = el.checked; save(p); });
  ctx.on("[data-side]", "click", (e, b) => { const p = push.prefs(); p.activity_side = b.dataset.side; save(p); });
  ctx.on("[data-kind]", "change", (e, el) => {
    const p = push.prefs(); const set = new Set(p.activity_kinds);
    el.checked ? set.add(el.dataset.kind) : set.delete(el.dataset.kind);
    if (!set.size) { toast("Keep at least one type"); el.checked = true; return; }
    p.activity_kinds = [...set]; save(p);
  });
  store.set("pushPromptDone", true);
  draw();
}
