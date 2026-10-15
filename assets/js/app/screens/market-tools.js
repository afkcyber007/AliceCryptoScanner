/* Market tools: Fibonacci and levels, currency strength with forex sessions, crypto peak hours, funding and the converter. */
import { html, raw, api, cached, plan, isPaid, go, qs, price, num, pct, upDown, ago, dateTime, skeleton, errorBox, gate, store, compact } from "../core.js";
import { MARKETS, detailHref } from "../components.js";

/* ------------------------------------------------------------------ Fibonacci and levels */
export async function fib(ctx) {
  ctx.top({ title: "Fibonacci and levels", sub: "Fibonacci, pivots and support and resistance" });
  let market = ctx.query.market || store.get("fibMarket", "crypto"), symbol = ctx.query.symbol || store.get("fibSymbol", "BTCUSDT"), tf = ctx.query.tf || "4h";
  if (!isPaid() && !["1h", "4h", "1d"].includes(tf)) tf = "4h";
  let list = [], d = null, err = null;
  const loadList = async () => { try { list = (await cached("/api/instruments?market=" + market, 600000, { auth: false })).items || []; } catch { list = []; } };
  const draw = () => {
    const f = d && d.fibonacci, sr = d && d.sr_check, piv = d && d.pivots;
    ctx.render(html`
      <section class="panel"><div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
        <div class="field"><label for="mk">Market</label><select id="mk">${MARKETS.map(([id, n]) => html`<option value="${id}" ${id === market ? raw("selected") : ""}>${n}</option>`)}</select></div>
        <div class="field"><label for="sy">Pair</label><select id="sy">${list.length ? list.map((i) => html`<option value="${i.symbol}" ${i.symbol === symbol ? raw("selected") : ""}>${i.display}${!i.free && !isPaid() ? " (Premium)" : ""}</option>`) : html`<option>${symbol}</option>`}</select></div>
        <div class="field"><label for="tf">Timeframe</label><select id="tf">${["15m", "1h", "4h", "1d", "1w"].map((t) => html`<option value="${t}" ${t === tf ? raw("selected") : ""}>${t.toUpperCase()}${!isPaid() && !["1h", "4h", "1d"].includes(t) ? " (Premium)" : ""}</option>`)}</select></div>
      </div></section>
      ${err ? errorBox(err) : !d ? skeleton(6) : html`
      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h2>Fibonacci retracement</h2>${f ? html`<span class="tag ${f.in_golden_zone ? "gold" : ""}">${f.in_golden_zone ? "In the golden zone" : "Retraced " + num(f.current_retracement || 0, 1) + "%"}</span>` : ""}</div>
          ${f ? html`<p class="note mt0">Latest swing ${f.direction === "up" ? "up" : "down"}: low ${price(f.low, market, symbol)}, high ${price(f.high, market, symbol)}. Price ${price(f.price, market, symbol)}.</p>
            <div class="list">${f.levels.map((l) => { const g = l.ratio >= 0.5 && l.ratio <= 0.65 && l.kind !== "extension"; return html`<div class="li"><span class="t" style="${g ? "color:var(--gold)" : ""}">${l.label}${l.kind === "extension" ? " extension" : ""}${g ? " golden zone" : ""}</span><span class="r">${price(l.price, market, symbol)}</span></div>`; })}</div>` : html`<p class="note">No clear swing on this timeframe.</p>`}</section>
        <section class="panel"><div class="panel-head"><h2>Support and resistance check</h2></div>
          <p style="margin:0 0 10px">${sr && sr.text || ""}</p>
          <div class="kv">${sr && sr.nearest_resistance ? html`<div><small>Nearest resistance</small><b class="down">${price(sr.nearest_resistance.price, market, symbol)}</b></div>` : ""}${sr && sr.nearest_support ? html`<div><small>Nearest support</small><b class="up">${price(sr.nearest_support.price, market, symbol)}</b></div>` : ""}</div>
          <div class="panel-head" style="margin-top:16px"><h2>Daily pivots</h2></div>
          ${piv && piv.classic ? html`<div class="kv">${Object.entries(piv.classic).map(([k, v]) => html`<div><small class="${k[0] === "R" ? "down" : k[0] === "S" ? "up" : ""}">${k}</small><b>${price(v, market, symbol)}</b></div>`)}</div>` : ""}
          <a class="btn btn-line btn-sm" style="margin-top:14px" href="${detailHref(market, symbol, tf)}">Open the full chart</a></section>
      </div>`}`);
  };
  const load = async () => {
    store.set("fibMarket", market); store.set("fibSymbol", symbol);
    try { d = await api("/api/instrument" + qs({ market, symbol, tf })); err = null; } catch (e) { if (e.status === 402) { go("/upgrade?plan=premium"); return; } err = e; d = null; }
    if (ctx.alive) draw();
  };
  ctx.on("#mk", "change", async (e) => { market = e.target.value; d = null; draw(); await loadList(); symbol = (list.find((i) => i.free) || list[0] || { symbol }).symbol; draw(); load(); });
  ctx.on("#sy", "change", (e) => { symbol = e.target.value; d = null; draw(); load(); });
  ctx.on("#tf", "change", (e) => { tf = e.target.value; d = null; draw(); load(); });
  await loadList(); draw(); await load();
}

/* ------------------------------------------------------------------ Currency strength + forex sessions */
const SESS = [
  { name: "Sydney", tz: "Australia/Sydney", open: 7, close: 16, color: "#7C8CF8" },
  { name: "Tokyo", tz: "Asia/Tokyo", open: 9, close: 18, color: "#E879B9" },
  { name: "London", tz: "Europe/London", open: 8, close: 17, color: "#5BB4F5" },
  { name: "New York", tz: "America/New_York", open: 8, close: 17, color: "#6BD49A" },
];
function tzOff(tz, d) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d);
  const g = {}; p.forEach((x) => (g[x.type] = x.value));
  return Math.round((Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour % 24, +g.minute, +g.second) - d.getTime()) / 60000);
}
const hm = (m) => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
function sessionsHtml() {
  const now = new Date(), local = -now.getTimezoneOffset();
  const nowMin = ((now.getUTCHours() * 60 + now.getUTCMinutes() + local) % 1440 + 1440) % 1440;
  const ny = new Date(now.getTime() + tzOff("America/New_York", now) * 60000), dow = ny.getUTCDay(), nh = ny.getUTCHours();
  const weekend = dow === 6 || (dow === 5 && nh >= 17) || (dow === 0 && nh < 17);
  const open = [];
  const rows = SESS.map((s) => {
    const off = tzOff(s.tz, now);
    const o = ((s.open * 60 - off + local) % 1440 + 1440) % 1440, c = ((s.close * 60 - off + local) % 1440 + 1440) % 1440;
    const on = !weekend && (o < c ? nowMin >= o && nowMin < c : nowMin >= o || nowMin < c);
    if (on) open.push(s.name);
    const segs = o < c ? [[o, c]] : [[o, 1440], [0, c]];
    return html`<div class="sess-row"><b>${s.name}<small>${hm(o)} to ${hm(c)}</small></b><div class="sess-bar">${segs.map((x) => raw(`<i style="left:${x[0] / 14.4}%;width:${(x[1] - x[0]) / 14.4}%;background:${s.color};${on ? "" : "opacity:.45"}"></i>`))}<span class="sess-now" style="left:${nowMin / 14.4}%"></span></div></div>`;
  });
  const status = weekend ? "Forex is closed for the weekend" : open.length >= 2 ? open.join(" and ") + " overlap: usually the busiest time" : open.length ? open[0] + " session is open" : "Between sessions: quiet market";
  return html`<p style="margin:0 0 12px;font-weight:600">${status}</p><div class="sessions">${rows}</div>
    <div class="sess-axis" style="margin-top:6px"><span></span><div><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>
    <p class="note" style="margin:10px 0 0">Times are in your time zone (${Intl.DateTimeFormat().resolvedOptions().timeZone || "local"}) and follow daylight saving automatically.</p>`;
}
export async function strength(ctx) {
  ctx.top({ title: "Currency strength", sub: "Strength, market hours and volatility" });
  let tf = "1h", d = null, err = null;
  const draw = () => ctx.render(html`
    <section class="panel"><div class="panel-head"><h2>Forex sessions</h2></div>${sessionsHtml()}</section>
    <section class="panel"><div class="panel-head"><h2>Currency strength</h2>
      <div class="tabs small" role="group" aria-label="Timeframe">${["1h", "4h", "1d"].map((t) => html`<button type="button" data-tf="${t}" aria-pressed="${t === tf}">${t.toUpperCase()}</button>`)}</div></div>
      ${err ? errorBox(err) : !d ? skeleton(8, 30) : html`
        ${d.idea && d.idea.pair ? html`<a class="banner upgrade" href="${detailHref("forex", d.idea.pair, tf)}" style="margin-bottom:14px"><span class="emo">💡</span><span><b>${d.idea.pair}: ${d.idea.bias}</b><span class="muted">${d.idea.text}</span></span><span class="tag ${/BUY/i.test(d.idea.bias) ? "bull" : "bear"}">${d.idea.bias}</span></a>` : ""}
        <div class="bars">${(d.rows || []).map((r) => { const v = r.strength * 10; const c = v >= 60 ? "var(--bull)" : v <= 40 ? "var(--bear)" : "var(--gold)";
          return html`<div class="bar"><span><b>${r.currency}</b> <span class="${upDown(r.change_pct)} small">${pct(r.change_pct)}</span></span><span class="meter"><i style="width:${Math.max(3, v)}%;background:${c}"></i></span><b>${num(r.strength, 1)}</b></div>`; })}</div>
        <p class="note" style="margin:12px 0 0">Strength from 0 to 10 measured against all other majors over ${tf.toUpperCase()}. Pair the strongest with the weakest for cleaner trends. Updated ${ago(d.updated_at)}.</p>`}
    </section>`);
  const load = async () => { try { d = await api("/api/strength?tf=" + tf); err = null; } catch (e) { err = e; } if (ctx.alive) draw(); };
  ctx.on("[data-tf]", "click", (e, b) => { tf = b.dataset.tf; d = null; draw(); load(); });
  draw(); await load(); ctx.every(60000, () => { draw(); load(); });
}

/* ------------------------------------------------------------------ Crypto peak hours */
export async function hours(ctx) {
  ctx.top({ title: "Crypto peak hours", sub: "Volume and volatility by hour" });
  let local = store.get("hoursLocal", true), d = null;
  const draw = () => {
    if (!d) { ctx.render(skeleton(1, 260)); return; }
    const off = local ? -new Date().getTimezoneOffset() / 60 : 0;
    const label = (h) => String(((h + off) % 24 + 24) % 24).padStart(2, "0") + ":00";
    const max = Math.max(...d.hours.map((h) => h.volume), 1), nowH = new Date().getUTCHours();
    const col = { high: "var(--bull)", medium: "var(--gold)", low: "var(--faint)" };
    ctx.render(html`<section class="panel">
      <div class="panel-head"><h2>Activity by hour</h2><div class="tabs small" role="group"><button type="button" data-local="1" aria-pressed="${local}">My time</button><button type="button" data-local="0" aria-pressed="${!local}">UTC</button></div></div>
      <div style="display:grid;grid-template-columns:repeat(24,1fr);gap:3px;align-items:end;height:180px;margin-top:8px" role="img" aria-label="Volume by hour">
        ${d.hours.map((h) => raw(`<div title="${label(h.hour)}: ${h.level} activity, range ${h.range_pct.toFixed(2)}%" style="height:${Math.max(6, h.volume / max * 100)}%;background:${col[h.level] || "var(--sky)"};border-radius:4px 4px 0 0;opacity:${h.hour === nowH ? 1 : .75};outline:${h.hour === nowH ? "2px solid var(--text)" : "none"}"></div>`))}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--faint);margin-top:6px"><span>${label(0)}</span><span>${label(6)}</span><span>${label(12)}</span><span>${label(18)}</span><span>${label(23)}</span></div>
      <div class="legend"><span><i style="background:var(--bull);height:8px"></i>High</span><span><i style="background:var(--gold);height:8px"></i>Medium</span><span><i style="background:var(--faint);height:8px"></i>Low</span><span>Outlined bar: now</span></div>
    </section>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Busiest hours</h2></div><p class="mt0" style="margin:0;font-size:18px;font-weight:600">${(d.best_hours || []).slice().sort((a, b) => ((a + off) % 24 + 24) % 24 - ((b + off) % 24 + 24) % 24).map(label).join(", ") || "--"}</p></section>
      <section class="panel"><div class="panel-head"><h2>Quietest hours</h2></div><p class="mt0" style="margin:0;font-size:18px;font-weight:600">${(d.quiet_hours || []).slice().sort((a, b) => ((a + off) % 24 + 24) % 24 - ((b + off) % 24 + 24) % 24).map(label).join(", ") || "--"}</p></section>
    </div>
    ${d.weekend_vs_weekday != null ? html`<p class="note">Weekend volume is about ${d.weekend_vs_weekday}% of a normal weekday.</p>` : ""}
    ${d.note ? html`<p class="note">${d.note}</p>` : ""}`);
  };
  ctx.on("[data-local]", "click", (e, b) => { local = b.dataset.local === "1"; store.set("hoursLocal", local); draw(); });
  draw();
  try { d = await cached("/api/crypto/hours", 600000, { auth: false }); draw(); } catch (e) { ctx.render(errorBox(e)); }
}

/* ------------------------------------------------------------------ Funding and open interest (Premium) */
export async function funding(ctx) {
  ctx.top({ title: "Funding and open interest", sub: "Crypto futures positioning" });
  if (plan() === "free") {
    ctx.render(gate("premium", "Funding and open interest", "See where crypto futures traders are crowded: funding rates, next funding time and open interest for the biggest perpetual markets.",
      ["Live funding rate for each coin", "Open interest in dollars and its 24-hour change", "Spot crowded longs and shorts before a squeeze"]));
    return;
  }
  let sort = "oi", d = null;
  const draw = () => {
    if (!d) { ctx.render(skeleton(8)); return; }
    const items = (d.items || []).slice().sort((a, b) => sort === "oi" ? (b.open_interest_usd || 0) - (a.open_interest_usd || 0) : sort === "high" ? b.funding_rate - a.funding_rate : a.funding_rate - b.funding_rate);
    ctx.render(html`<div class="tabs" role="group"><button type="button" data-sort="oi" aria-pressed="${sort === "oi"}">Biggest open interest</button><button type="button" data-sort="high" aria-pressed="${sort === "high"}">Highest funding</button><button type="button" data-sort="low" aria-pressed="${sort === "low"}">Lowest funding</button></div>
      <section class="panel"><div class="list">${items.map((r) => html`<a class="li" href="${detailHref("crypto", r.symbol, "1h")}"><span><span class="t">${r.display}</span><span class="s">${price(r.price, "crypto")} <span class="${upDown(r.change24h)}">${pct(r.change24h)}</span></span></span>
        <span class="r"><b class="${r.funding_rate > 0.0005 ? "down" : r.funding_rate < 0 ? "up" : ""}">${num(r.funding_rate * 100, 4)}%</b><small class="muted">OI $${compact(r.open_interest_usd)} ${r.oi_change_24h != null ? html`<span class="${upDown(r.oi_change_24h)}">${pct(r.oi_change_24h, 1)}</span>` : ""}</small></span></a>`)}</div></section>
      <p class="note">Positive funding: longs pay shorts. Very high funding with rising open interest means crowded longs. Updated ${ago(d.updated_at)}.</p>`);
  };
  ctx.on("[data-sort]", "click", (e, b) => { sort = b.dataset.sort; draw(); });
  const load = async () => { try { d = await api("/api/funding"); draw(); } catch (e) { ctx.render(errorBox(e)); } };
  draw(); await load(); ctx.every(60000, load);
}

/* ------------------------------------------------------------------ Converter */
export async function converter(ctx) {
  ctx.top({ title: "Currency converter", sub: "160+ currencies, crypto and gold" });
  ctx.render(skeleton(3));
  let d;
  try { d = await cached("/api/fx/world", 600000, { auth: false }); } catch (e) { ctx.render(errorBox(e)); return; }
  const codes = Object.keys(d.rates).sort((a, b) => {
    const top = ["USD", "EUR", "GBP", "JPY", "PKR", "INR", "AED", "SAR", "BTC", "ETH", "USDT", "XAU"]; const ia = top.indexOf(a), ib = top.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); return a.localeCompare(b);
  });
  let from = store.get("cvFrom", "USD"), to = store.get("cvTo", d.rates.PKR ? "PKR" : "EUR"), amt = 100;
  if (!d.rates[from]) from = "USD";
  if (!d.rates[to] || to === from) to = codes.find((c) => c !== from) || from;
  const opts = (sel) => codes.map((c) => html`<option ${c === sel ? raw("selected") : ""}>${c}</option>`);
  ctx.render(html`<section class="panel"><div class="fields">
      <div class="field full"><label for="amt">Amount</label><input id="amt" type="number" inputmode="decimal" value="${amt}" step="any"></div>
      <div class="field"><label for="from">From</label><select id="from">${opts(from)}</select></div>
      <div class="field"><label for="to">To</label><select id="to">${opts(to)}</select></div>
    </div>
    <button class="btn btn-line btn-sm" style="margin-top:12px" data-swap>Swap</button>
    <div class="result big" style="margin-top:16px"><span id="lbl"></span><b id="res"></b></div>
    <p class="note" id="rate"></p></section>
    <p class="note">Mid-market rates updated ${ago(d.updated_at)}. Banks and exchanges add their own spread.</p>`);
  const calc = () => {
    const a = parseFloat(ctx.view.querySelector("#amt").value) || 0; from = ctx.view.querySelector("#from").value; to = ctx.view.querySelector("#to").value;
    store.set("cvFrom", from); store.set("cvTo", to);
    const x = d.rates[to] / d.rates[from]; const dd = (v) => (Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 4 : 8);
    ctx.view.querySelector("#lbl").textContent = num(a, dd(a)) + " " + from + " =";
    ctx.view.querySelector("#res").textContent = num(a * x, dd(a * x)) + " " + to;
    ctx.view.querySelector("#rate").textContent = "1 " + from + " = " + num(x, dd(x)) + " " + to + ", 1 " + to + " = " + num(1 / x, dd(1 / x)) + " " + from;
  };
  ctx.on("input,select", "input", calc); ctx.on("select", "change", calc);
  ctx.on("[data-swap]", "click", () => { const f = ctx.view.querySelector("#from"), t = ctx.view.querySelector("#to"), x = f.value; f.value = t.value; t.value = x; calc(); });
  calc();
}
