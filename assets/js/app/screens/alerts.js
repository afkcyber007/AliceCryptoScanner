/* Alerts: price, RSI, breakout, volume and trend alerts checked by the server around the clock. */
import { A, html, raw, api, cached, session, plan, isPaid, qs, price, dateTime, ago, skeleton, errorBox, needLogin, toast, confirmSheet, emit } from "../core.js";
import { MARKETS, detailHref } from "../components.js";

export default async function alerts(ctx) {
  ctx.top({ title: "Alerts", sub: "The server watches the market for you" });
  if (!session.loggedIn) { ctx.render(needLogin("alerts")); return; }
  emit("alerts-seen");
  let page = null, err = null, list = [];
  const f = { market: ctx.query.market || "crypto", symbol: ctx.query.symbol || "", type: "price_above", tf: "1h", threshold: "" };
  const loadList = async () => { try { list = (await cached("/api/instruments?market=" + f.market, 600000, { auth: false })).items || []; } catch { list = []; } if (!f.symbol && list[0]) f.symbol = (list.find((i) => i.free) || list[0]).symbol; };
  const notifState = () => ("Notification" in window ? Notification.permission : "unsupported");

  const draw = () => {
    if (err && !page) { ctx.render(errorBox(err)); return; }
    if (!page) { ctx.render(skeleton(6)); return; }
    const types = page.types || [], t = types.find((x) => x.id === f.type) || types[0] || {}, free = page.plan === "free";
    ctx.render(html`
      <section class="panel"><div class="panel-head"><h2>New alert</h2><span class="note">${page.alerts.length} of ${page.limit >= 100000 ? "unlimited" : page.limit} used</span></div>
        <form id="af" class="fields" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))" novalidate>
          <div class="field"><label for="a-m">Market</label><select id="a-m">${MARKETS.map(([id, nm]) => html`<option value="${id}" ${id === f.market ? raw("selected") : ""}>${nm}</option>`)}</select></div>
          <div class="field"><label for="a-s">Pair</label><select id="a-s">${list.map((i) => html`<option value="${i.symbol}" ${i.symbol === f.symbol ? raw("selected") : ""}>${i.display}</option>`)}</select></div>
          <div class="field"><label for="a-t">Alert when</label><select id="a-t">${types.filter((x) => !x.crypto_only || f.market === "crypto").map((x) => html`<option value="${x.id}" ${x.id === f.type ? raw("selected") : ""}>${x.emoji} ${x.label}${x.premium && free ? " (Premium)" : ""}</option>`)}</select></div>
          ${t.tf ? html`<div class="field"><label for="a-tf">Timeframe</label><select id="a-tf">${["5m", "15m", "1h", "4h", "1d"].map((x) => html`<option value="${x}" ${x === f.tf ? raw("selected") : ""}>${x.toUpperCase()}${free && !["1h", "4h", "1d"].includes(x) ? " (Premium)" : ""}</option>`)}</select></div>` : ""}
          ${t.threshold ? html`<div class="field"><label for="a-v">${f.type.startsWith("price") ? "Price" : f.type.startsWith("rsi") ? "RSI level" : "Times average volume"}</label><input id="a-v" type="number" step="any" inputmode="decimal" value="${f.threshold || (t.default ?? "")}" placeholder="${f.type.startsWith("price") ? "e.g. 70000" : ""}"></div>` : ""}
          <div class="field full"><button class="btn btn-gold" type="submit">Create alert</button></div>
        </form>
        <p class="err" id="a-err" hidden></p>
      </section>
      <section class="panel"><div class="panel-head"><h2>Notifications</h2></div>
        ${notifState() === "granted" ? html`<p class="note mt0" style="margin:0">Browser notifications are on. You'll get them while Alice is open in a tab. For notifications on your phone at any time, use the Android app.</p>`
          : notifState() === "unsupported" ? html`<p class="note mt0" style="margin:0">This browser can't show notifications. Triggered alerts appear below and as a message in the app. On iPhone, add Alice to your home screen first.</p>`
          : html`<p class="note mt0">Allow notifications to get a pop-up when an alert fires while Alice is open.</p><button class="btn btn-line btn-sm" data-notif>Turn on notifications</button>`}
      </section>
      <section class="panel"><div class="panel-head"><h2>Your alerts</h2><span class="note">Checked every ${page.interval_minutes || 5} minutes</span></div>
        ${page.alerts.length ? html`<div class="list">${page.alerts.map((a) => html`<div class="li"><a href="${detailHref(a.market, a.symbol, a.timeframe)}" style="color:inherit;text-decoration:none;min-width:0"><span class="t">${a.emoji} ${a.symbol}</span><span class="s">${a.description}${a.paused_premium ? " (paused, Premium)" : ""}${a.last_triggered_at ? ", last fired " + ago(a.last_triggered_at) : ""}</span></a>
          <span class="r" style="display:flex;gap:6px;align-items:center"><button class="btn btn-line btn-sm" data-toggle="${a.id}" data-on="${a.enabled ? 1 : 0}">${a.enabled ? "On" : "Off"}</button><button class="icon-btn" data-del="${a.id}" aria-label="Delete alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></span></div>`)}</div>`
          : html`<div class="empty"><b>No alerts yet</b>Create one above, or open any market and tap Set an alert.</div>`}
      </section>
      <section class="panel"><div class="panel-head"><h2>Recently triggered</h2>${page.events.length ? html`<button class="link" data-clear>Clear</button>` : ""}</div>
        ${page.events.length ? html`<div class="list">${page.events.map((e) => html`<a class="li" href="${detailHref(e.market, e.symbol)}"><span><span class="t">${e.title}</span><span class="s" style="white-space:normal">${e.body}</span></span><span class="r note">${dateTime(e.created_at)}</span></a>`)}</div>` : html`<p class="note mt0" style="margin:0">Nothing has fired yet.</p>`}
      </section>`);
  };
  const load = async (force) => {
    try { page = await api("/api/alerts"); err = null; } catch (e) { err = e; }
    const typing = document.activeElement && document.activeElement.closest && document.activeElement.closest("#af");
    if (ctx.alive && (force || !typing)) draw();
  };
  ctx.on("#a-m", "change", async (e) => { f.market = e.target.value; f.symbol = ""; await loadList(); draw(); });
  ctx.on("#a-s", "change", (e) => { f.symbol = e.target.value; });
  ctx.on("#a-t", "change", (e) => { f.type = e.target.value; f.threshold = ""; draw(); });
  ctx.on("#a-tf", "change", (e) => { f.tf = e.target.value; });
  ctx.on("#a-v", "input", (e) => { f.threshold = e.target.value; });
  ctx.on("#af", "submit", async (e) => {
    e.preventDefault();
    const er = ctx.view.querySelector("#a-err"); er.hidden = true;
    const t = (page.types || []).find((x) => x.id === f.type) || {};
    try {
      await api("/api/alerts", { method: "POST", body: { market: f.market, symbol: f.symbol, type: f.type, timeframe: t.tf ? f.tf : "1h", threshold: t.threshold ? parseFloat(f.threshold || t.default) : null } });
      toast("Alert created"); f.threshold = ""; await load(true);
    } catch (ex) {
      er.innerHTML = ""; er.append(ex.message);
      if (ex.status === 402) { const a = document.createElement("a"); a.href = "#/upgrade?plan=" + ((ex.extra && ex.extra.tier) || "premium"); a.textContent = " Upgrade"; er.append(a); }
      er.hidden = false;
    }
  });
  ctx.on("[data-toggle]", "click", async (e, b) => {
    try { await api("/api/alerts/" + b.dataset.toggle, { method: "PATCH", body: { enabled: b.dataset.on !== "1" } }); await load(); } catch (ex) { toast(ex.message); }
  });
  ctx.on("[data-del]", "click", async (e, b) => {
    if (!(await confirmSheet("Delete this alert?", "You can create it again any time.", "Delete", true))) return;
    try { await api("/api/alerts/" + b.dataset.del, { method: "DELETE" }); await load(); } catch (ex) { toast(ex.message); }
  });
  ctx.on("[data-clear]", "click", async () => { try { await api("/api/alerts/events", { method: "DELETE" }); await load(); } catch (ex) { toast(ex.message); } });
  ctx.on("[data-notif]", "click", async () => { try { await Notification.requestPermission(); } catch { } draw(); });
  await loadList(); draw(); await load(); ctx.every(60000, () => load(false));
}
