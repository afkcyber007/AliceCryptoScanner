/* Best Trades (Elite) and the whale / unusual activity radar. */
import { html, raw, api, session, plan, qs, price, pct, num, upDown, sideTag, skeleton, errorBox, ago, gate, needLogin, compact } from "../core.js";
import { MARKETS, detailHref } from "../components.js";

const BEST_PERKS = ["Best crypto coins", "Best forex pairs", "Best US stocks and indices", "Gold and commodities",
  "Scalping (15M and 1H) and intraday (1H and 4H) setups", "Entry, stop loss and two targets for every trade",
  "BUY only when the scanner is bullish, SELL only when it is bearish"];

export async function best(ctx) {
  ctx.top({ title: "Best Trades", sub: "Top setups in every market, Elite" });
  if (plan() !== "elite") {
    ctx.render(html`${gate("elite", "Best Trades is an Elite section", "Every 10 minutes Alice ranks every market and shows the cleanest setups, confirmed by both the strategy and the scanner, with entry, stop loss and two targets.", BEST_PERKS)}
      <div class="panel" style="margin-top:16px"><div class="panel-head"><h2>Preview</h2></div><div class="list locked-row">
      ${[1, 2, 3].map((i) => html`<div class="li"><span><span class="t">#${i} ●●●/USDT</span><span class="s">Entry ●●● Stop ●●● Target ●●●</span></span><span class="tag bull">BUY</span></div>`)}</div></div>`);
    return;
  }
  let style = ctx.query.style || "intraday", market = ctx.query.market || "", data = null, err = null;
  const draw = () => ctx.render(html`
    <div class="tabs" role="group" aria-label="Style"><button type="button" data-style="intraday" aria-pressed="${style === "intraday"}">📅 Intraday (1H and 4H)</button><button type="button" data-style="scalp" aria-pressed="${style === "scalp"}">⚡ Scalping (15M and 1H)</button></div>
    <div class="tabs small" role="group" aria-label="Market"><button type="button" data-m="" aria-pressed="${market === ""}">All markets</button>${MARKETS.map(([id, n]) => html`<button type="button" data-m="${id}" aria-pressed="${id === market}">${n}</button>`)}</div>
    ${err ? errorBox(err) : !data ? skeleton(5, 120) : !(data.items || []).length
      ? html`<div class="panel"><div class="empty"><b>Scanning</b>No clean setups right now, the market may be ranging. Alice refreshes every 10 minutes.</div></div>`
      : html`<p class="note">Timeframe ${String(data.timeframe || "").toUpperCase()}, confirmed on ${String(data.confirm || "").toUpperCase()}. Updated ${ago(data.updated_at)}.</p>
        <div class="grid-2">${data.items.map((p, i) => bestCard(p, i + 1, data.timeframe))}</div>`}
    ${data && data.note ? html`<p class="note">${data.note}</p>` : ""}
    <p class="note">Setups are generated automatically and are not financial advice. Always use a stop loss and size every trade from your risk.</p>`);
  const load = async () => { try { data = await api("/api/best" + qs({ style, market })); err = null; } catch (e) { err = e; } if (ctx.alive) draw(); };
  ctx.on("[data-style]", "click", (e, b) => { style = b.dataset.style; data = null; draw(); load(); });
  ctx.on("[data-m]", "click", (e, b) => { market = b.dataset.m; data = null; draw(); load(); });
  draw(); await load(); ctx.every(120000, load);
}

function bestCard(p, rank, tf) {
  const buy = /BUY|LONG/i.test(p.side);
  return html`<a class="panel" href="${detailHref(p.market, p.symbol, tf)}" style="text-decoration:none;color:inherit;display:block">
    <div class="panel-head"><span style="display:flex;align-items:center;gap:10px"><b style="color:var(--gold);font:700 18px var(--display)">#${rank}</b><b style="font-size:16px">${p.display}</b></span>${sideTag(p.side)}</div>
    <div class="kv">
      <div><small>Entry</small><b>${p.entry_fmt || price(p.price, p.market, p.symbol)}</b></div>
      <div><small>Stop loss</small><b class="down">${p.sl_fmt}</b></div>
      <div><small>Target 1</small><b class="up">${p.tp1_fmt}</b></div>
      <div><small>Target 2</small><b class="up">${p.tp2_fmt}</b></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px"><span class="note">Score ${num(p.score, 0)}, 24h <span class="${upDown(p.change24h)}">${pct(p.change24h)}</span></span>
      ${p.status ? html`<span class="tag ${/tp|win/i.test(p.status) ? "bull" : /sl|loss/i.test(p.status) ? "bear" : ""}">${p.status}</span>` : ""}</div>
    ${(p.reasons || []).length ? html`<ul class="small muted" style="margin:10px 0 0;padding-left:18px">${p.reasons.slice(0, 4).map((r) => html`<li>${r}</li>`)}</ul>` : ""}
  </a>`;
}

const KINDS = [["", "All"], ["whale", "🐋 Whales"], ["ready", "⏳ Getting ready"], ["flow", "📊 Buying and selling"], ["unusual", "🚀 Unusual moves"], ["listing", "🆕 Listings"]];
const KIND_ICON = { whale_buy: "🐋", whale_sell: "🐋", listing: "🆕", unusual_move: "🚀", squeeze: "⏳", quiet_accumulation: "⏳", quiet_distribution: "⏳", accumulation: "📊", distribution: "📊" };

export async function activity(ctx) {
  ctx.top({ title: "Whale radar", sub: "Big orders, pumps and dumps, listings" });
  let kind = ctx.query.kind || "", data = null, err = null;
  const elite = plan() === "elite";
  const draw = () => ctx.render(html`
    ${elite ? "" : html`<a class="banner upgrade" href="#/upgrade?plan=elite"><span class="emo">👑</span><span><b>See which coin and the details</b><span class="muted">Free and Premium see listings and a locked preview. Elite sees everything, with alerts.</span></span><span class="btn btn-gold btn-sm">Elite</span></a>`}
    <div class="tabs" role="group" aria-label="Type">${KINDS.map(([id, n]) => html`<button type="button" data-kind="${id}" aria-pressed="${id === kind}">${n}</button>`)}</div>
    <section class="panel">
      ${err ? errorBox(err) : !data ? skeleton(6) : !(data.items || []).length ? html`<div class="empty"><b>Quiet market</b>No big events in the last 48 hours for this filter.</div>`
        : html`<div class="list">${data.items.map((e) => html`<${e.locked ? "div" : "a"} class="li" ${e.locked ? "" : raw(`href="${detailHref(e.market, e.symbol, "15m")}"`)}>
          <span class="with-ic"><span class="lead-ic">${KIND_ICON[e.kind] || "⚡"}</span><span><span class="t">${e.title || e.display}</span><span class="s">${e.locked ? e.body : (e.display ? e.display + ", " : "") + (e.body || "")}</span></span></span>
          <span class="r">${e.value_usd ? html`<b>$${compact(e.value_usd)}</b>` : ""}<small class="muted">${ago(e.created_at)}</small></span></${e.locked ? "div" : "a"}>`)}</div>`}
    </section>
    <p class="note">Small orders and small coins are ignored. You only see the big, important moves.</p>`);
  const load = async () => { try { data = await api("/api/activity" + qs({ kind })); err = null; } catch (e) { err = e; } if (ctx.alive) draw(); };
  ctx.on("[data-kind]", "click", (e, b) => { kind = b.dataset.kind; data = null; draw(); load(); });
  draw(); await load(); ctx.every(60000, load);
}
