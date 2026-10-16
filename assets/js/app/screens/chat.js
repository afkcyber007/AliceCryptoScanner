/* Live discussion rooms (same rooms as the Android app). */
import { html, raw, api, session, esc, dateTime, toast, confirmSheet, icon } from "../core.js";
import * as push from "../push.js";

const ROOMS = { crypto: "Crypto discussion", forex: "Forex and gold discussion" };

export default async function chat(ctx) {
  const room = ROOMS[ctx.params.room] ? ctx.params.room : "crypto";
  const bellOn = () => push.enabled() && push.prefs()["chat_" + room];
  const bell = () => `<button class="icon-btn room-bell${bellOn() ? " on" : ""}" type="button" data-bell aria-pressed="${bellOn()}" aria-label="Notify me about new messages" title="Notify me about new messages">${icon.bell}</button>`;
  const top = () => ctx.top({ title: ROOMS[room], sub: "Live", actions: bell() });
  top();
  document.getElementById("top-actions").onclick = async (e) => {
    if (!e.target.closest("[data-bell]")) return;
    const p = push.prefs(), on = !bellOn();
    try {
      if (on && !push.enabled()) await push.enable();
      p["chat_" + room] = on; push.savePrefs(p); await push.subscribe();
      toast(on ? "You'll get a notification when traders post here" : "Room notifications off");
    } catch (ex) { toast(ex.message, 6000); }
    top();
  };
  ctx.cleanup(() => { const t = document.getElementById("top-actions"); if (t) t.onclick = null; });
  let lastId = 0, me = null, msgs = [], online = 0, pinned = "", rules = "", sending = false;
  const myId = session.user && session.user.id;
  ctx.render(html`<div class="chat">
    <div class="tabs small" role="group">${Object.entries(ROOMS).map(([id, n]) => html`<a href="#/chat/${id}" class="${id === room ? "on" : ""}">${n}</a>`)}</div>
    <div class="chat-meta"><span id="c-online"></span><span id="c-pin"></span></div>
    <div class="chat-log" id="log" aria-live="polite"><p class="note center">Loading messages…</p></div>
    <div id="c-foot"></div></div>`);
  const log = ctx.view.querySelector("#log");
  const badge = (m) => (m.is_admin ? '<span class="tag gold">Admin</span>' : m.plan === "elite" ? '<span class="tag gold">Elite</span>' : m.plan === "premium" ? '<span class="tag sky">Premium</span>' : "");
  const msgHtml = (m) => `<div class="msg${m.user_id === myId ? " me" : ""}" data-id="${m.id}"><div class="who">${esc(m.name || "Trader")} ${badge(m)}<time>${esc(dateTime(m.created_at, { hour: "2-digit", minute: "2-digit" }))}</time>${m.user_id !== myId && session.loggedIn ? `<button class="rep" data-report="${m.id}" title="Report">Report</button>` : ""}</div><div class="txt" data-notr>${esc(m.text)}</div></div>`;
  const foot = () => {
    const f = ctx.view.querySelector("#c-foot"); if (!f) return;
    if (!session.loggedIn) { f.innerHTML = `<div class="panel center" style="padding:12px">Log in to join the conversation. <a href="#/login?next=/chat/${room}">Log in</a> or <a href="#/signup">sign up free</a></div>`; return; }
    if (me && me.banned) { f.innerHTML = `<div class="panel center" style="padding:12px;color:var(--bear)">You can't post in the rooms because of repeated rule breaks. Contact support if you think this is a mistake.</div>`; return; }
    if (!f.querySelector("form")) {
      f.innerHTML = `<form class="chat-form" id="cf"><textarea id="ct" maxlength="500" placeholder="Share your view on the market…" aria-label="Message" rows="1"></textarea><button class="btn btn-gold" type="submit">Send</button></form><p class="note" id="c-left" style="margin:6px 0 0"></p>`;
      const ta = f.querySelector("#ct");
      ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); f.querySelector("#cf").requestSubmit(); } });
    }
    const left = f.querySelector("#c-left");
    if (left) left.textContent = (me && me.messages_left != null ? me.messages_left + " messages left today. Premium: unlimited. " : "") + (me && me.warnings ? me.warnings + " of " + me.max_warnings + " warnings." : "");
  };
  const render = (scroll) => {
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    log.innerHTML = msgs.length ? msgs.map(msgHtml).join("") : `<div class="empty"><b>Be the first to post</b>${esc(rules)}</div>`;
    if (scroll || atBottom) log.scrollTop = log.scrollHeight;
    ctx.view.querySelector("#c-online").textContent = online ? online + " online now" : "";
    ctx.view.querySelector("#c-pin").textContent = pinned;
  };
  const poll = async (first) => {
    try {
      const r = await api(`/api/chat/${room}?after=${lastId}`);
      me = r.me; online = r.online; pinned = r.pinned || ""; rules = r.rules || "";
      const del = new Set(r.deleted_ids || []);
      msgs = msgs.filter((m) => !del.has(m.id)).concat(r.messages || []).slice(-200);
      if (msgs.length) lastId = Math.max(lastId, ...msgs.map((m) => m.id));
      render(first); foot();
    } catch (e) { if (first) log.innerHTML = `<div class="empty"><b>Can't load the room</b>${esc(e.message)}</div>`; }
  };
  ctx.on("#cf", "submit", async (e) => {
    e.preventDefault();
    const ta = ctx.view.querySelector("#ct"), text = ta.value.trim();
    if (!text || sending) return;
    sending = true;
    try { const r = await api(`/api/chat/${room}`, { method: "POST", body: { text } }); ta.value = ""; msgs.push(r.message); lastId = Math.max(lastId, r.message.id); render(true); poll(); }
    catch (ex) { toast(ex.message, 4000); }
    sending = false;
  });
  ctx.on("[data-report]", "click", async (e, b) => {
    if (!(await confirmSheet("Report this message?", "Our moderators will review it. Messages that break the rules are removed.", "Report"))) return;
    try { await api("/api/chat/report/" + b.dataset.report, { method: "POST" }); toast("Thanks, the message was reported"); } catch (ex) { toast(ex.message); }
  });
  await poll(true);
  ctx.every(4000, () => poll(false));
}
