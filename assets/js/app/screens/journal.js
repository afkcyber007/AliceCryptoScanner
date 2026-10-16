/* Trading journal and portfolio tracker. Stored only in this browser (like the app stores them on the phone). */
import { html, raw, api, cached, store, isPaid, upsell, num, usd, pct, upDown, date, toast, confirmSheet, sheet, esc, price, skeleton } from "../core.js";
import { md } from "../components.js";

const STRATEGIES = ["EMA pullback", "Breakout", "S/R bounce", "Fibonacci", "Trend follow", "Reversal", "News", "SMC", "Alice Best Trade", "Other"];
const EMOTIONS = ["Calm", "Confident", "FOMO", "Fear", "Revenge", "Bored", "Greedy"];
const FREE_JOURNAL_PER_MONTH = 20, FREE_HOLDINGS = 5;
const loadTrades = () => store.get("journal", []);
const saveTrades = (t) => store.set("journal", t);
const n = (v) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(x) ? x : null; };

function rMult(t) {
  if (t.exit == null || t.stop == null) return t.pnl != null && t.risk > 0 ? t.pnl / t.risk : null;
  const risk = Math.abs(t.entry - t.stop); if (!(risk > 0)) return null;
  return (t.side === "BUY" ? t.exit - t.entry : t.entry - t.exit) / risk;
}
const pnlOf = (t) => (t.pnl != null ? t.pnl : rMult(t) != null && t.risk != null ? rMult(t) * t.risk : null);
const closed = (t) => t.exit != null || t.pnl != null;
function session(ms) { const h = new Date(ms).getUTCHours(); return h <= 6 ? "Asia" : h <= 11 ? "London" : h <= 15 ? "London/NY overlap" : h <= 20 ? "New York" : "Late US / Asia"; }

function stats(trades) {
  const c = trades.filter((t) => closed(t) && pnlOf(t) != null);
  const wins = c.filter((t) => pnlOf(t) > 0).length;
  const gross = c.filter((t) => pnlOf(t) > 0).reduce((a, t) => a + pnlOf(t), 0);
  const loss = c.filter((t) => pnlOf(t) < 0).reduce((a, t) => a + pnlOf(t), 0);
  const rs = c.map(rMult).filter((x) => x != null);
  const group = (key) => { const m = {}; c.forEach((t) => { const k = key(t); m[k] = (m[k] || 0) + pnlOf(t); }); return m; };
  const byPair = group((t) => t.symbol.toUpperCase()), bySess = group((t) => session(t.opened));
  const best = (m, pos) => { const e = Object.entries(m).sort((a, b) => b[1] - a[1]); const x = pos ? e[0] : e[e.length - 1]; return x && (pos ? x[1] > 0 : x[1] < 0) ? x[0] : null; };
  const byStrategy = Object.entries(c.reduce((m, t) => { const k = t.strategy || "Unspecified"; (m[k] = m[k] || []).push(t); return m; }, {}))
    .map(([k, v]) => [k, v.length, v.filter((t) => pnlOf(t) > 0).length * 100 / v.length]).sort((a, b) => b[2] - a[2]);
  const patterns = [];
  const noStop = c.filter((t) => t.stop == null);
  if (noStop.length >= 2) patterns.push(`${noStop.length} trades had no stop loss (net ${usd(noStop.reduce((a, t) => a + pnlOf(t), 0))}). Always define your stop before entering.`);
  ["FOMO", "Revenge", "Greedy", "Bored"].forEach((em) => { const t = c.filter((x) => x.emotion === em); if (t.length >= 2) { const wr = t.filter((x) => pnlOf(x) > 0).length * 100 / t.length; if (wr < 50) patterns.push(`Trades marked "${em}" win only ${Math.round(wr)}% of the time. Consider skipping trades when you feel this way.`); } });
  const big = c.filter((t) => (rMult(t) ?? 0) < -1.2); if (big.length >= 2) patterns.push(`${big.length} losses were bigger than 1R. Stops may be moved or ignored.`);
  return { total: trades.length, closed: c.length, wins, winRate: c.length ? wins * 100 / c.length : null, net: c.reduce((a, t) => a + pnlOf(t), 0),
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null, pf: loss < 0 ? gross / Math.abs(loss) : null,
    bestPair: best(byPair, true), worstPair: best(byPair, false), bestSession: best(bySess, true), byStrategy, patterns };
}

export async function journal(ctx) {
  ctx.top({ title: "Trading journal", sub: "Track trades and find your edge" });
  let trades = loadTrades(), aiText = "", aiBusy = false;
  const draw = () => {
    const s = stats(trades);
    ctx.render(html`
      <div class="btn-row"><button class="btn btn-gold" data-add>${raw('<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>')} Add a trade</button>
        <button class="btn btn-line btn-sm" data-export ${trades.length ? "" : raw("disabled")}>Export CSV</button></div>
      <section class="panel"><div class="panel-head"><h2>Your statistics</h2><span class="note">${s.closed} closed of ${s.total}</span></div>
        <div class="kv"><div><small>Win rate</small><b>${s.winRate != null ? Math.round(s.winRate) + "%" : "--"}</b></div><div><small>Net result</small><b class="${upDown(s.net)}">${usd(s.net)}</b></div>
          <div><small>Average R</small><b>${s.avgR != null ? num(s.avgR, 2) : "--"}</b></div><div><small>Profit factor</small><b>${s.pf != null ? num(s.pf, 2) : "--"}</b></div>
          <div><small>Best pair</small><b>${s.bestPair || "--"}</b></div><div><small>Worst pair</small><b>${s.worstPair || "--"}</b></div><div><small>Best session</small><b>${s.bestSession || "--"}</b></div></div>
        ${s.byStrategy.length ? html`<div class="list" style="margin-top:12px">${s.byStrategy.map(([k, cnt, wr]) => html`<div class="li"><span class="t">${k}</span><span class="r">${cnt} trades, ${Math.round(wr)}% wins</span></div>`)}</div>` : ""}
        ${s.patterns.length ? html`<div style="margin-top:12px">${s.patterns.map((p) => html`<p class="warn small" style="margin:0 0 6px">${p}</p>`)}</div>` : ""}
      </section>
      <section class="panel"><div class="panel-head"><h2>AI coaching</h2>${isPaid() ? "" : html`<span class="tag sky">Premium</span>`}</div>
        ${!isPaid() ? html`<p class="note mt0">Get an AI review of your statistics and habits with Premium.</p><a class="btn btn-gold btn-sm" href="#/upgrade?plan=premium">Unlock AI coaching</a>`
          : s.closed < 5 ? html`<p class="note mt0">Log at least 5 closed trades first.</p>`
          : aiBusy ? skeleton(3, 30) : aiText ? html`<div class="prose-sm">${md(aiText)}</div>` : html`<button class="btn btn-line btn-sm" data-ai>Review my trading</button>`}
      </section>
      <section class="panel"><div class="panel-head"><h2>Trades</h2></div>
        ${trades.length ? html`<div class="list">${trades.slice().sort((a, b) => b.opened - a.opened).map((t) => { const p = pnlOf(t), r = rMult(t);
          return html`<button type="button" class="li" data-edit="${t.id}"><span><span class="t">${t.side === "BUY" ? "🟢" : "🔴"} ${t.symbol}</span><span class="s">${date(t.opened)}${t.strategy ? ", " + t.strategy : ""}${t.emotion ? ", " + t.emotion : ""}</span></span>
            <span class="r">${closed(t) ? html`<b class="${upDown(p ?? 0)}">${p != null ? usd(p) : "--"}</b><small class="muted">${r != null ? num(r, 2) + "R" : ""}</small>` : html`<span class="tag sky">Open</span>`}</span></button>`; })}</div>`
          : html`<div class="empty"><b>No trades yet</b>Log every trade: setup, entry, stop, result and how you felt. After 20 to 30 trades the patterns appear.</div>`}
      </section>
      <p class="note">Your journal is saved in this browser only. Export it as CSV to keep a copy.</p>`);
  };
  const edit = (t) => {
    const isNew = !t; t = t || { id: Math.random().toString(36).slice(2), side: "BUY", market: "crypto", opened: Date.now() };
    const v = (x) => (x == null ? "" : x);
    const s = sheet(`<h2>${isNew ? "Add a trade" : "Edit trade"}</h2><form class="form" id="jf">
      <div class="fields">
        <div class="field"><label for="j-sym">Symbol</label><input id="j-sym" value="${esc(v(t.symbol))}" placeholder="BTCUSDT, EURUSD" required></div>
        <div class="field"><label for="j-side">Direction</label><select id="j-side"><option value="BUY" ${t.side === "BUY" ? "selected" : ""}>Buy / long</option><option value="SELL" ${t.side === "SELL" ? "selected" : ""}>Sell / short</option></select></div>
        <div class="field"><label for="j-entry">Entry</label><input id="j-entry" type="number" step="any" inputmode="decimal" value="${v(t.entry)}" required></div>
        <div class="field"><label for="j-exit">Exit (empty if open)</label><input id="j-exit" type="number" step="any" inputmode="decimal" value="${v(t.exit)}"></div>
        <div class="field"><label for="j-stop">Stop loss</label><input id="j-stop" type="number" step="any" inputmode="decimal" value="${v(t.stop)}"></div>
        <div class="field"><label for="j-target">Target</label><input id="j-target" type="number" step="any" inputmode="decimal" value="${v(t.target)}"></div>
        <div class="field"><label for="j-risk">Risk in USD</label><input id="j-risk" type="number" step="any" inputmode="decimal" value="${v(t.risk)}"></div>
        <div class="field"><label for="j-pnl">Result in USD (optional)</label><input id="j-pnl" type="number" step="any" inputmode="decimal" value="${v(t.pnl)}"></div>
        <div class="field"><label for="j-str">Strategy</label><select id="j-str"><option value="">None</option>${STRATEGIES.map((x) => `<option ${x === t.strategy ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label for="j-emo">Emotion</label><select id="j-emo"><option value="">None</option>${EMOTIONS.map((x) => `<option ${x === t.emotion ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field full"><label for="j-date">Opened</label><input id="j-date" type="datetime-local" value="${new Date(t.opened - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></div>
        <div class="field full"><label for="j-notes">Notes</label><textarea id="j-notes">${esc(v(t.notes))}</textarea></div>
      </div>
      <div class="btn-row"><button class="btn btn-gold" type="submit">Save</button>${isNew ? "" : '<button class="btn btn-line" type="button" data-del style="color:var(--bear)">Delete</button>'}</div></form>`, { label: "Trade" });
    const f = s.el.querySelector("#jf"), g = (id) => f.querySelector("#" + id).value;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!g("j-sym").trim() || n(g("j-entry")) == null) { toast("Enter at least the symbol and entry price"); return; }
      Object.assign(t, { symbol: g("j-sym").trim().toUpperCase(), side: g("j-side"), entry: n(g("j-entry")), exit: n(g("j-exit")), stop: n(g("j-stop")), target: n(g("j-target")),
        risk: n(g("j-risk")), pnl: n(g("j-pnl")), strategy: g("j-str"), emotion: g("j-emo"), notes: g("j-notes"), opened: new Date(g("j-date")).getTime() || t.opened });
      if (t.exit != null && !t.closedAt) t.closedAt = Date.now();
      trades = loadTrades().filter((x) => x.id !== t.id).concat([t]); saveTrades(trades); s.close(); draw(); toast("Trade saved");
    });
    const del = f.querySelector("[data-del]");
    if (del) del.addEventListener("click", async () => { s.close(); if (await confirmSheet("Delete this trade?", "This can't be undone.", "Delete", true)) { trades = loadTrades().filter((x) => x.id !== t.id); saveTrades(trades); draw(); } });
  };
  ctx.on("[data-add]", "click", () => {
    const m = new Date(); const start = new Date(m.getFullYear(), m.getMonth(), 1).getTime();
    if (!isPaid() && loadTrades().filter((t) => (t.opened || 0) >= start).length >= FREE_JOURNAL_PER_MONTH) {
      upsell("premium", "Free plan: " + FREE_JOURNAL_PER_MONTH + " trades per month", "You logged " + FREE_JOURNAL_PER_MONTH + " trades this month. Premium logs unlimited trades and adds AI coaching.", ["Unlimited journal trades", "AI review of your habits", "Every market and timeframe"]);
      return;
    }
    edit(null);
  });
  ctx.on("[data-edit]", "click", (e, b) => edit(trades.find((t) => t.id === b.dataset.edit)));
  ctx.on("[data-export]", "click", () => {
    const head = ["opened", "symbol", "side", "entry", "exit", "stop", "target", "risk_usd", "result_usd", "r", "strategy", "emotion", "notes"];
    const rows = trades.map((t) => [new Date(t.opened).toISOString(), t.symbol, t.side, t.entry, t.exit ?? "", t.stop ?? "", t.target ?? "", t.risk ?? "", pnlOf(t) ?? "", rMult(t) != null ? rMult(t).toFixed(2) : "", t.strategy || "", t.emotion || "", (t.notes || "").replace(/\n/g, " ")]);
    const csv = [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "alice-journal.csv"; a.click();
  });
  ctx.on("[data-ai]", "click", async () => {
    const s = stats(trades); aiBusy = true; draw();
    try {
      const r = await api("/api/ai/journal", { method: "POST", body: { trades: s.total, closed: s.closed, win_rate: s.winRate || 0, net_pnl: s.net, avg_r: s.avgR || 0, profit_factor: s.pf || 0,
        best_pair: s.bestPair || "", worst_pair: s.worstPair || "", best_session: s.bestSession || "", by_strategy: s.byStrategy.map(([k, c, w]) => ({ strategy: k, trades: c, win_rate: w })), patterns: s.patterns,
        recent: trades.slice(-30).map((t) => ({ symbol: t.symbol, side: t.side, r: rMult(t) || 0, strategy: t.strategy || "", emotion: t.emotion || "", session: session(t.opened), had_stop: t.stop != null })) } });
      aiText = r.text;
    } catch (e) { aiText = e.message; }
    aiBusy = false; draw();
  });
  draw();
}

/* ------------------------------------------------------------------ portfolio */
export async function portfolio(ctx) {
  ctx.top({ title: "Portfolio tracker", sub: "Live value and profit or loss" });
  let hold = store.get("portfolio", []), rates = {};
  const priceOf = (sym) => { const s = sym.toUpperCase(); return rates[s] || rates[s + "USDT"] || null; };
  const draw = () => {
    let value = 0, cost = 0;
    const rows = hold.map((h) => { const p = priceOf(h.symbol); const v = p != null ? p * h.qty : null; if (v != null) { value += v; cost += h.avg * h.qty; } return { ...h, p, v }; });
    const pl = value - cost;
    ctx.render(html`
      <section class="panel"><div class="kv"><div><small>Value</small><b>${usd(value)}</b></div><div><small>Profit or loss</small><b class="${upDown(pl)}">${usd(pl)} ${cost ? html`<span class="small">(${pct(pl / cost * 100)})</span>` : ""}</b></div><div><small>Holdings</small><b>${hold.length}</b></div></div></section>
      <button class="btn btn-gold" data-add>Add a holding</button>
      <section class="panel">${rows.length ? html`<div class="list">${rows.map((h) => html`<button type="button" class="li" data-edit="${h.id}"><span><span class="t">${h.symbol}</span><span class="s">${num(h.qty, h.qty >= 1 ? 4 : 8)} at ${price(h.avg)}</span></span>
          <span class="r">${h.v != null ? html`<b>${usd(h.v)}</b><small class="${upDown(h.p - h.avg)}">${pct((h.p - h.avg) / h.avg * 100)}</small>` : html`<small class="muted">No live price</small>`}</span></button>`)}</div>`
        : html`<div class="empty"><b>No holdings yet</b>Add the coins and assets you hold to follow their live value.</div>`}</section>
      <p class="note">Prices for crypto (e.g. BTC, ETH), forex pairs and gold (XAUUSD). Your portfolio is saved in this browser only.</p>`);
  };
  const edit = (h) => {
    const isNew = !h; h = h || { id: Math.random().toString(36).slice(2) };
    const s = sheet(`<h2>${isNew ? "Add a holding" : "Edit holding"}</h2><form class="form" id="pf">
      <div class="field"><label for="p-sym">Symbol</label><input id="p-sym" value="${esc(h.symbol || "")}" placeholder="BTC, ETH, XAUUSD" required></div>
      <div class="field"><label for="p-qty">Quantity</label><input id="p-qty" type="number" step="any" inputmode="decimal" value="${h.qty ?? ""}" required></div>
      <div class="field"><label for="p-avg">Average buy price</label><input id="p-avg" type="number" step="any" inputmode="decimal" value="${h.avg ?? ""}" required></div>
      <div class="btn-row"><button class="btn btn-gold" type="submit">Save</button>${isNew ? "" : '<button class="btn btn-line" type="button" data-del style="color:var(--bear)">Remove</button>'}</div></form>`, { label: "Holding" });
    const f = s.el.querySelector("#pf");
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const sym = f.querySelector("#p-sym").value.trim().toUpperCase().replace(/[\/\s]/g, ""), qty = n(f.querySelector("#p-qty").value), avg = n(f.querySelector("#p-avg").value);
      if (!sym || qty == null || avg == null) { toast("Fill in all three fields"); return; }
      Object.assign(h, { symbol: sym, qty, avg }); hold = hold.filter((x) => x.id !== h.id).concat([h]); store.set("portfolio", hold); s.close(); draw();
    });
    const del = f.querySelector("[data-del]");
    if (del) del.addEventListener("click", () => { hold = hold.filter((x) => x.id !== h.id); store.set("portfolio", hold); s.close(); draw(); });
  };
  ctx.on("[data-add]", "click", () => {
    if (!isPaid() && hold.length >= FREE_HOLDINGS) { upsell("premium", "Free plan: " + FREE_HOLDINGS + " holdings", "Track your whole portfolio with Premium.", ["Unlimited holdings", "Live value and profit or loss", "No full-screen ads"]); return; }
    edit(null);
  });
  ctx.on("[data-edit]", "click", (e, b) => edit(hold.find((x) => x.id === b.dataset.edit)));
  const load = async () => { try { rates = (await cached("/api/fx/rates", 60000, { auth: false })).rates || {}; } catch { } if (ctx.alive) draw(); };
  draw(); await load(); ctx.every(60000, load);
}
