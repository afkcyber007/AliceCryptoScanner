/* One market: chart, score breakdown, levels, Fibonacci, pivots, smart money concepts, futures and written analysis. */
import { html, raw, api, session, isPaid, go, isWatched, toggleWatch, toast, qs, price, pct, num, upDown, scoreCls, labelTag, skeleton, errorBox, ago, toMs, icon, dateTime } from "../core.js";
import { drawChart } from "../chart.js";
import { partsBars, marketName } from "../components.js";

const TFS = ["5m", "15m", "1h", "4h", "1d", "1w"];
const FREE_TFS = ["1h", "4h", "1d"];
const PART_LABELS = { trend: "Trend", momentum: "Momentum", volume: "Volume", structure: "Structure", breakout: "Breakout", higher_tf: "Higher timeframe" };

export default async function detail(ctx) {
  const { market, symbol } = ctx.params;
  let tf = ctx.query.tf || "1h";
  if (!isPaid() && !FREE_TFS.includes(tf)) tf = "1h";
  let d = null, err = null, pivotKind = "classic", showFib = false, analysis = null, analysisErr = null, analysisBusy = false;
  let stopChart = () => {};
  ctx.cleanup(() => stopChart());
  ctx.top({ title: symbol, sub: marketName(market) });

  const draw = () => {
    if (err && !d) { ctx.render(errorBox(err)); return; }
    if (!d) { ctx.render(skeleton(1, 340) + skeleton(4)); return; }
    const a = d.analysis || {}, paid = isPaid();
    const sc = Math.round(a.score || 50);
    ctx.top({ title: a.display || symbol, sub: marketName(market) + ", " + tf.toUpperCase() });
    const z = d.zones || {}, sr = d.sr_check || {}, fib = d.fibonacci, piv = d.pivots || {}, smc = d.smc, fut = d.futures;
    ctx.render(html`
      <section class="panel">
        <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-end">
          <div><div style="font:700 30px/1.1 var(--display);font-variant-numeric:tabular-nums">${price(a.price, market, symbol)}</div>
            <div class="${upDown(a.change24h)}" style="font-weight:600">${pct(a.change24h)} in 24 hours</div></div>
          <div class="bigscore" style="min-width:220px"><span class="n ${scoreCls(sc).replace("s-", "") === "bull" ? "up" : scoreCls(sc) === "s-bear" ? "down" : ""}">${sc}</span><span class="l">${a.label || ""}</span><div class="track"><i style="left:${Math.max(2, Math.min(98, sc))}%"></i></div></div>
        </div>
        <div class="tabs small" style="margin-top:14px" role="group" aria-label="Timeframe">${TFS.map((t) => html`<button type="button" data-tf="${t}" aria-pressed="${t === tf}">${t.toUpperCase()}${!paid && !FREE_TFS.includes(t) ? " 🔒" : ""}</button>`)}</div>
        <div class="chart-wrap" id="chart" style="margin-top:12px"></div>
        <div class="legend"><span><i style="background:#F5B941"></i>EMA 21</span><span><i style="background:#3BA7FF"></i>EMA 50</span><span><i style="background:#A898FF"></i>EMA 200</span><span><i style="background:rgba(22,199,132,.5);height:8px"></i>Support</span><span><i style="background:rgba(234,57,67,.5);height:8px"></i>Resistance</span>
          ${fib ? html`<label style="display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-fib ${showFib ? raw("checked") : ""} style="width:16px;height:16px;min-height:0"> Fibonacci</label>` : ""}</div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-line btn-sm star-btn${isWatched(market, symbol) ? " on" : ""}" type="button" data-watch aria-pressed="${isWatched(market, symbol)}">${isWatched(market, symbol) ? "★ In watchlist" : "☆ Add to watchlist"}</button>
          <a class="btn btn-gold btn-sm" href="#/alerts${qs({ market, symbol })}">${icon.bell} Set an alert</a>
          <a class="btn btn-line btn-sm" href="#/ai${qs({ market, symbol, tf })}">${icon.ai} AI pair report</a>
          <button class="btn btn-line btn-sm" type="button" data-analysis>${icon.book} Written analysis</button>
        </div>
      </section>

      <div id="analysis-box">${analysisBox()}</div>

      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h2>Why the score is ${sc}</h2></div>${partsBars(a.breakdown || {}, PART_LABELS)}
          ${(a.signals || []).length ? html`<div class="btn-row" style="margin-top:12px">${a.signals.map((s) => labelTag(s))}</div>` : ""}</section>
        <section class="panel"><div class="panel-head"><h2>Every timeframe</h2></div>
          ${d.mtf ? html`<div class="list">${Object.entries(d.mtf).map(([k, v]) => html`<div class="li"><span class="t">${k.toUpperCase()}</span><span class="r">${labelTag(v.label)} <b style="margin-left:8px">${v.score}</b></span></div>`)}</div>`
            : html`<div class="empty" style="padding:14px"><b>Multi-timeframe matrix</b>See the score on 15M, 1H, 4H and 1D side by side with Premium.<div><a class="btn btn-gold btn-sm" href="#/upgrade?plan=premium">Unlock</a></div></div>`}</section>
      </div>

      <section class="panel"><div class="panel-head"><h2>Indicators</h2><span class="note">Updated ${ago(a.updated_at)}</span></div>
        <div class="kv">
          <div><small>RSI 14</small><b class="${a.rsi >= 70 ? "down" : a.rsi <= 30 ? "up" : ""}">${num(a.rsi, 1)}</b></div>
          <div><small>MACD histogram</small><b class="${upDown(a.macd_hist)}">${num(a.macd_hist, Math.abs(a.macd_hist) < 1 ? 5 : 2)}</b></div>
          <div><small>Stochastic K / D</small><b>${num(a.stoch_k, 0)} / ${num(a.stoch_d, 0)}</b></div>
          <div><small>ATR</small><b>${price(a.atr, market, symbol)} (${num(a.atr_pct, 2)}%)</b></div>
          ${a.has_volume ? html`<div><small>Relative volume</small><b>${num(a.rel_volume, 2)}x</b></div><div><small>Buy pressure</small><b class="${a.buy_pressure >= 0.5 ? "up" : "down"}">${num((a.buy_pressure || 0) * 100, 0)}%</b></div>` : ""}
          <div><small>EMA 21</small><b>${price(a.ema21, market, symbol)}</b></div>
          <div><small>EMA 50</small><b>${price(a.ema50, market, symbol)}</b></div>
          <div><small>EMA 200</small><b>${price(a.ema200, market, symbol)}</b></div>
          <div><small>Structure</small><b>${a.structure || "--"}</b></div>
        </div></section>

      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h2>Support and resistance</h2></div>
          ${sr.text ? html`<p style="margin:0 0 10px">${sr.text}</p>` : ""}
          <div class="list">
            ${(z.resistances || []).slice(0, 3).reverse().map((r) => html`<div class="li"><span><span class="t down">Resistance</span><span class="s">${r.touches} touch${r.touches === 1 ? "" : "es"}, ${r.strength}</span></span><span class="r">${price(r.price, market, symbol)}<small class="muted">${pct(r.distance_pct)}</small></span></div>`)}
            <div class="li"><span class="t">Price now</span><span class="r"><b>${price(a.price, market, symbol)}</b></span></div>
            ${(z.supports || []).slice(0, 3).map((r) => html`<div class="li"><span><span class="t up">Support</span><span class="s">${r.touches} touch${r.touches === 1 ? "" : "es"}, ${r.strength}</span></span><span class="r">${price(r.price, market, symbol)}<small class="muted">${pct(r.distance_pct)}</small></span></div>`)}
          </div></section>
        <section class="panel"><div class="panel-head"><h2>Fibonacci</h2>${fib ? html`<span class="tag ${fib.in_golden_zone ? "gold" : ""}">${fib.in_golden_zone ? "In the golden zone" : "Retraced " + num(fib.current_retracement || 0, 1) + "%"}</span>` : ""}</div>
          ${fib ? html`<div class="list">${(fib.levels || []).map((l) => html`<div class="li"><span class="t ${l.ratio >= 0.5 && l.ratio <= 0.65 && l.kind !== "extension" ? "" : "muted"}" style="${l.ratio >= 0.5 && l.ratio <= 0.65 && l.kind !== "extension" ? "color:var(--gold)" : ""}">${l.label}${l.kind === "extension" ? " ext." : ""}</span><span class="r">${price(l.price, market, symbol)}</span></div>`)}</div>
            <p class="note" style="margin:8px 0 0">Measured ${fib.direction === "up" ? "up from " + price(fib.low, market, symbol) + " to " + price(fib.high, market, symbol) : "down from " + price(fib.high, market, symbol) + " to " + price(fib.low, market, symbol)}.</p>` : html`<p class="note">Not enough data.</p>`}</section>
      </div>

      <section class="panel"><div class="panel-head"><h2>Pivot points</h2>
        <div class="tabs small" role="group" aria-label="Pivot method">${Object.keys(piv).map((k) => html`<button type="button" data-pivot="${k}" aria-pressed="${k === pivotKind}">${k[0].toUpperCase() + k.slice(1)}</button>`)}</div></div>
        ${piv[pivotKind] ? html`<div class="kv">${Object.entries(piv[pivotKind]).map(([k, v]) => html`<div><small class="${k[0] === "R" ? "down" : k[0] === "S" ? "up" : ""}">${k}</small><b>${price(v, market, symbol)}</b></div>`)}</div>` : html`<p class="note">Not available.</p>`}
      </section>

      <section class="panel"><div class="panel-head"><h2>Smart money concepts</h2></div>
        ${smc ? smcHtml(smc, market, symbol) : html`<div class="empty" style="padding:14px"><b>Order blocks, fair value gaps and liquidity</b>Market structure, BOS and CHoCH, order blocks, FVGs, equal highs and lows and premium and discount zones are part of Premium.<div><a class="btn btn-gold btn-sm" href="#/upgrade?plan=premium">Unlock</a></div></div>`}
      </section>

      ${(d.patterns || []).length ? html`<section class="panel"><div class="panel-head"><h2>Candlestick patterns</h2></div><div class="list">${d.patterns.map((p) => html`<div class="li"><span class="t">${p.name}</span><span class="r">${labelTag(p.side)}</span></div>`)}</div></section>` : ""}

      ${market === "crypto" ? html`<section class="panel"><div class="panel-head"><h2>Futures positioning</h2></div>
        ${fut ? html`<div class="kv"><div><small>Funding rate</small><b class="${fut.funding_rate > 0.0005 ? "down" : fut.funding_rate < 0 ? "up" : ""}">${num(fut.funding_rate * 100, 4)}%</b></div>
          <div><small>Next funding</small><b>${dateTime(fut.next_funding_time, { hour: "2-digit", minute: "2-digit" })}</b></div>
          <div><small>Open interest</small><b>$${num((fut.open_interest_usd || 0) / 1e6, 2)}M</b></div>
          ${fut.oi_change_24h != null ? html`<div><small>OI change 24h</small><b class="${upDown(fut.oi_change_24h)}">${pct(fut.oi_change_24h)}</b></div>` : ""}</div>`
          : html`<p class="note" style="margin:0">Funding and open interest are part of Premium. <a href="#/upgrade?plan=premium">Unlock</a></p>`}</section>` : ""}

      <p class="note">Generated automatically from market data. Not financial advice.</p>`);
    stopChart();
    stopChart = drawChart(ctx.view.querySelector("#chart"), d.candles || [], { market, symbol, zones: d.zones, fib: showFib ? fib : null });
  };

  function analysisBox() {
    if (analysisBusy) return skeleton(3, 40);
    if (analysisErr) {
      if (analysisErr.status === 401) return html`<div class="panel"><p style="margin:0 0 10px">Log in to read the written analysis. Free accounts get 3 a day.</p><a class="btn btn-gold btn-sm" href="#/login">Log in</a></div>`;
      return html`<div class="panel"><p class="err" style="margin:0">${analysisErr.message}</p>${analysisErr.code === "limit" || analysisErr.status === 429 || analysisErr.status === 402 ? html`<a class="btn btn-gold btn-sm" style="margin-top:10px" href="#/upgrade?plan=premium">Unlimited analysis with Premium</a>` : ""}</div>`;
    }
    if (!analysis) return "";
    const left = analysis.quota && analysis.quota.analysis_left;
    return html`<section class="panel"><div class="panel-head"><h2>Written analysis, ${tf.toUpperCase()}</h2>${left != null ? html`<span class="note">${left} left today</span>` : ""}</div>
      <div class="prose-sm">${(analysis.sections || []).map((s) => html`<h3>${s.title}</h3><p>${s.body}</p>`)}</div></section>`;
  }

  const load = async () => {
    try { d = await api("/api/instrument" + qs({ market, symbol, tf })); err = null; }
    catch (e) {
      if (e.status === 402) { tf = "1h"; go("/upgrade?plan=premium"); return; }
      err = e;
    }
    if (ctx.alive) draw();
  };
  ctx.on("[data-watch]", "click", (e, b) => {
    const r = toggleWatch(market, symbol);
    if (r === "full") { toast("Watchlist full. Premium allows 200"); go("/upgrade?plan=premium"); return; }
    const on = r === "added";
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.textContent = on ? "★ In watchlist" : "☆ Add to watchlist";
    toast(on ? "Added to your watchlist" : "Removed from your watchlist");
  });
  ctx.on("[data-tf]", "click", (e, b) => {
    const t = b.dataset.tf;
    if (!isPaid() && !FREE_TFS.includes(t)) { go("/upgrade?plan=premium"); return; }
    tf = t; d = null; analysis = null; analysisErr = null; draw(); load();
  });
  ctx.on("[data-pivot]", "click", (e, b) => { pivotKind = b.dataset.pivot; draw(); });
  ctx.on("[data-fib]", "change", (e) => { showFib = e.target.checked; draw(); });
  ctx.on("[data-analysis]", "click", async () => {
    analysisBusy = true; analysisErr = null; ctx.view.querySelector("#analysis-box").innerHTML = String(analysisBox());
    try { analysis = await api("/api/analysis" + qs({ market, symbol, tf })); } catch (e) { analysisErr = e; }
    analysisBusy = false;
    const box = ctx.view.querySelector("#analysis-box"); if (box) { box.innerHTML = String(analysisBox()); box.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  draw();
  await load();
  ctx.every(60000, load);
}

function smcHtml(s, market, symbol) {
  const st = s.structure || {}, ev = st.last_event, pd = s.premium_discount || {}, liq = s.liquidity || {};
  const zoneRow = (z, kind) => html`<div class="li"><span><span class="t ${z.side === "bullish" ? "up" : "down"}">${z.side === "bullish" ? "Bullish" : "Bearish"} ${kind}</span></span><span class="r">${price(z.bottom, market, symbol)} to ${price(z.top, market, symbol)}</span></div>`;
  return html`<div class="kv" style="margin-bottom:12px">
      <div><small>Structure</small><b class="${st.trend === "bullish" ? "up" : st.trend === "bearish" ? "down" : ""}">${st.trend || "range"}</b></div>
      ${ev ? html`<div><small>Last event</small><b>${ev.type} ${ev.side} at ${price(ev.level, market, symbol)}</b></div>` : ""}
      <div><small>Zone</small><b>${pd.zone || "--"} (${num((pd.position || 0) * 100, 0)}% of range)</b></div>
      <div><small>Equilibrium</small><b>${price(pd.equilibrium, market, symbol)}</b></div>
    </div>
    <div class="list">
      ${(s.order_blocks || []).slice(-3).reverse().map((z) => zoneRow(z, "order block"))}
      ${(s.fvg || []).slice(-3).reverse().map((z) => zoneRow(z, "fair value gap"))}
      ${(liq.equal_highs || []).length ? html`<div class="li"><span class="t">Equal highs (liquidity above)</span><span class="r">${liq.equal_highs.map((v) => price(v, market, symbol)).join(", ")}</span></div>` : ""}
      ${(liq.equal_lows || []).length ? html`<div class="li"><span class="t">Equal lows (liquidity below)</span><span class="r">${liq.equal_lows.map((v) => price(v, market, symbol)).join(", ")}</span></div>` : ""}
      ${liq.sweep ? html`<div class="li"><span class="t">Liquidity sweep</span><span class="r">${liq.sweep.text || price(liq.sweep.level, market, symbol)}</span></div>` : ""}
    </div>`;
}
