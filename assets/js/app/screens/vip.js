/* VIP Signal Rooms: Forex & Gold room, Crypto room (Scalping + Futures). Elite + the 10-day free trial. */
import { html, raw, api, session, toast, copy, skeleton, errorBox, ago, icon, featList } from "../core.js";
import * as push from "../push.js";

const ROOM_OF = { forex: "forex", crypto_scalp: "crypto", crypto_futures: "crypto" };
const PERKS = ["Forex & Gold VIP: 5–7 entries a day + gold scalps in London and New York",
  "Crypto Scalping: breakout and squeeze entries on 1,000 Binance pairs",
  "Crypto Futures: 5 targets, stop to break-even after TP2",
  "Instant alerts on your phone and in the browser",
  "Every result tracked on real candles: TP hits and stops"];

const resultTag = (it) => {
  if (it.status === "active") return html`<span class="tag sky">● Live${it.hits.length ? " · TP" + Math.max(...it.hits) + " hit" : ""}</span>`;
  if (/^TP/.test(it.result)) return html`<span class="tag bull">✅ ${it.result} +${it.result_value}${it.unit === "pips" ? " pips" : "%"}</span>`;
  if (it.result === "BE") return html`<span class="tag">⚖️ Break-even</span>`;
  if (it.result === "SL") return html`<span class="tag bear">❌ Stop -${Math.abs(it.result_value)}${it.unit === "pips" ? " pips" : "%"}</span>`;
  return html`<span class="tag">Closed</span>`;
};

function card(it) {
  const buy = /BUY|LONG/.test(it.side);
  if (it.locked) {
    return html`<div class="vip-card locked"><div class="vip-top"><b>${it.display}</b><span class="tag ${buy ? "bull" : "bear"}">${it.side}</span></div>
      <div class="vip-rows"><span>Entry ●●●</span><span>TP ●●● · ●●● · ●●●</span><span>SL ●●●</span></div>
      <a class="btn btn-gold btn-sm" href="#/upgrade?plan=elite">👑 Unlock with Elite</a></div>`;
  }
  const tps = (it.tps_fmt || []).map((v, i) => html`<li class="${it.hits.includes(i + 1) ? "hit" : ""}"><span>TP${i + 1}</span><b>${v}</b><small>${(it.tp_labels || [])[i] || ""}</small>${it.hits.includes(i + 1) ? html`<em>✓</em>` : ""}</li>`);
  return html`<article class="vip-card ${buy ? "buy" : "sell"} ${it.status}">
    <div class="vip-top"><span><b class="vip-pair">${it.display}</b>${it.kind === "scalp" && it.feed === "forex" ? html` <span class="tag gold">⚡ Gold scalp</span>` : ""}</span>
      <span class="tag ${buy ? "bull" : "bear"}">${it.side}</span></div>
    <div class="vip-meta">${resultTag(it)}<span class="note">${it.model}${it.leverage ? " · " + it.leverage : ""} · ${ago(it.created_at)}</span>${it.strength ? html`<span class="note">💪 ${Math.round(it.strength)}%</span>` : ""}</div>
    <div class="vip-entry"><span>Entry</span><b>${it.entry_fmt}</b><span>Stop loss</span><b class="down">${it.be && it.status === "active" ? it.sl_fmt + " (entry)" : it.sl_initial_fmt} <small>${it.sl_label}</small></b></div>
    <ol class="vip-tps">${tps}</ol>
    ${it.reason ? html`<p class="vip-reason">💡 ${it.reason}</p>` : ""}
    <div class="btn-row" style="margin:8px 0 0"><button class="btn btn-line btn-sm" data-copy="${it.id}">📋 Copy signal</button></div>
  </article>`;
}

export default async function vip(ctx) {
  ctx.top({ title: "VIP Signal Rooms", sub: "Forex, gold and crypto signals · Elite" });
  let feed = ctx.params.feed && ROOM_OF[ctx.params.feed] ? ctx.params.feed : (ctx.query.feed || "forex");
  if (!ROOM_OF[feed]) feed = "forex";
  let data = null, err = null, busy = false;
  const room = () => ROOM_OF[feed];

  const draw = () => {
    if (err) { ctx.render(errorBox(err)); return; }
    const f = data && data.feed;
    const s = f ? f.stats : null;
    const items = data ? data.items : [];
    const active = items.filter((x) => x.status === "active"), closed = items.filter((x) => x.status !== "active");
    ctx.render(html`
      <div class="tabs vip-rooms" role="group" aria-label="Room">
        <button type="button" data-room="forex" aria-pressed="${room() === "forex"}">💹 Forex & Gold Room</button>
        <button type="button" data-room="crypto" aria-pressed="${room() === "crypto"}">₿ Crypto Room</button></div>
      ${room() === "crypto" ? html`<div class="tabs small" role="group" aria-label="Crypto feed">
        <button type="button" data-feed="crypto_scalp" aria-pressed="${feed === "crypto_scalp"}">⚡ Scalping</button>
        <button type="button" data-feed="crypto_futures" aria-pressed="${feed === "crypto_futures"}">🏦 Futures</button></div>` : ""}
      ${!data ? skeleton(4, 140) : html`
      <section class="panel vip-head ${room()}">
        <div class="panel-head"><h2>${f.emoji} ${f.title}</h2>${data.access ? html`<button class="btn btn-sm ${f.alerts ? "btn-gold" : "btn-line"}" data-alerts ${busy ? raw("disabled") : ""}>${f.alerts ? "🔔 Alerts on" : "🔕 Turn on alerts"}</button>` : html`<span class="tag gold">👑 Elite</span>`}</div>
        <p class="muted" style="margin:0 0 12px">${f.desc}</p>
        <div class="vip-stats">
          <div><b>${s.win_rate == null ? "–" : s.win_rate + "%"}</b><span>win rate (30 days)</span></div>
          <div><b>${s.closed}</b><span>closed signals</span></div>
          <div><b>${s.all_targets}</b><span>hit every target</span></div>
          <div><b>${s.active}</b><span>live now</span></div></div>
        ${data.state === "trial" && data.plan !== "elite" ? html`<p class="note" style="margin:10px 0 0">🎁 Included in your 10-day free trial. Keep the rooms with <a href="#/upgrade?plan=elite">Elite, 15 USDT a month</a>.</p>` : ""}
      </section>
      ${!data.access ? html`<div class="gate"><div class="emo">👑</div><h2>VIP Signal Rooms are an Elite feature</h2>
        <p>See every entry, target and stop the moment it's published, with instant alerts. The results below are real and tracked automatically.</p>${featList(PERKS)}
        <div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="#/upgrade?plan=elite">Get Elite · 15 USDT a month</a></div>
        <p class="note">Or 90 USDT a year (save 50%).</p></div>` : ""}
      <h3 class="vip-h">● Live signals <span class="note">${active.length}</span></h3>
      ${active.length ? html`<div class="grid-2">${active.map(card)}</div>` : html`<div class="panel"><div class="empty"><b>Waiting for the best entries</b>The engine only publishes when every filter agrees. Turn on alerts and you'll know the moment a signal is posted.</div></div>`}
      ${(data.recent_wins || []).length ? html`<h3 class="vip-h">🏆 Latest targets hit</h3><div class="vip-wins">${data.recent_wins.map((w) => html`<span><b>${w.display}</b> ${w.side} ${w.result} <em>+${w.gain}${w.unit === "pips" ? " pips" : "%"}</em></span>`)}</div>` : ""}
      ${closed.length ? html`<h3 class="vip-h">Closed (last 14 days)</h3><div class="grid-2">${closed.slice(0, 20).map(card)}</div>` : ""}
      <p class="note">Signals are generated automatically from market data and are not financial advice. Trading with leverage can lose more than you expect — always use the stop loss and risk only what you can afford.</p>`}`);
  };

  const load = async () => {
    try { data = await api("/api/vip/" + feed); err = null; } catch (e) { err = e; }
    if (ctx.alive) draw();
  };
  ctx.on("[data-room]", "click", (e, b) => { feed = b.dataset.room === "forex" ? "forex" : "crypto_scalp"; data = null; draw(); load(); history.replaceState(null, "", "#/vip/" + feed); });
  ctx.on("[data-feed]", "click", (e, b) => { feed = b.dataset.feed; data = null; draw(); load(); history.replaceState(null, "", "#/vip/" + feed); });
  ctx.on("[data-copy]", "click", (e, b) => { const it = data.items.find((x) => String(x.id) === b.dataset.copy); if (it && it.text) copy(it.text, "Signal copied"); });
  ctx.on("[data-alerts]", "click", async () => {
    if (!data || busy) return;
    const on = !data.feed.alerts;
    busy = true; draw();
    try {
      await api("/api/vip/alerts", { method: "POST", body: { feed, on } });
      data.feed.alerts = on;
      if (on && push.support() && !push.enabled()) {
        try { await push.enable(); } catch { }
      }
      toast(on ? (push.enabled() ? "Alerts on — you'll get every new signal" : "Alerts on in the app. Allow browser notifications to get them here too.") : "Alerts off");
    } catch (e) { toast(e.message); }
    busy = false; draw();
  });
  draw(); await load(); ctx.every(60000, load);
}
