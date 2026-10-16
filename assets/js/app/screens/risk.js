/* Risk calculator pro: position size, margin, liquidation, fees and targets. Everything stays in the browser. */
import { html, raw, cached, store, num, usd, isPaid, lockedPreview } from "../core.js";

const PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "EURCHF", "AUDJPY", "CADJPY", "CHFJPY", "EURAUD", "GBPAUD", "XAUUSD", "XAGUSD"];

export default async function risk(ctx) {
  ctx.top({ title: "Risk calculator pro", sub: "Position size, margin, liquidation, targets" });
  const s = Object.assign({ mode: "crypto", side: "long", balance: "1000", risk: "1", entry: "", stop: "", tp1: "", tp2: "", lev: "10", fee: "0.05", pair: "EURUSD", pips: "20" }, store.get("riskPreset", {}));
  let rates = {};
  cached("/api/fx/rates", 120000, { auth: false }).then((r) => { rates = r.rates || {}; if (!s.entry && s.mode !== "forex") { s.entry = String(rates.BTCUSDT ? +rates.BTCUSDT.toFixed(2) : 65000); s.stop = String(+(s.entry * 0.98).toFixed(2)); s.tp1 = String(+(s.entry * 1.03).toFixed(2)); s.tp2 = String(+(s.entry * 1.06).toFixed(2)); } draw(); }).catch(() => draw());

  const field = (id, label, extra = "") => html`<div class="field"><label for="${id}">${label}</label><input id="${id}" data-k="${id}" type="number" inputmode="decimal" step="any" value="${s[id]}" ${raw(extra)}></div>`;
  const draw = () => {
    ctx.render(html`
      <div class="tabs" role="group"><button type="button" data-mode="crypto" aria-pressed="${s.mode === "crypto"}">Crypto futures</button><button type="button" data-mode="spot" aria-pressed="${s.mode === "spot"}">Spot and stocks</button><button type="button" data-mode="forex" aria-pressed="${s.mode === "forex"}">Forex and gold</button></div>
      <div class="grid-2">
        <section class="panel"><div class="fields">
          <div class="field full"><span class="lbl">Direction</span><div class="seg" role="group"><button type="button" data-side="long" aria-pressed="${s.side === "long"}">Long</button><button type="button" data-side="short" aria-pressed="${s.side === "short"}">Short</button></div></div>
          ${field("balance", "Account balance (USD)")}${field("risk", "Risk per trade (%)")}
          ${s.mode === "forex" ? html`<div class="field"><label for="pair">Pair</label><select id="pair" data-k="pair">${PAIRS.map((p) => html`<option ${p === s.pair ? raw("selected") : ""}>${p}</option>`)}</select></div>${field("pips", "Stop loss (pips)")}`
            : html`${field("entry", "Entry price")}${field("stop", "Stop loss price")}`}
          ${s.mode !== "forex" ? html`${field("tp1", "Target 1 (optional)")}${field("tp2", "Target 2 (optional)")}` : ""}
          ${s.mode === "crypto" ? html`${field("lev", "Leverage")}${field("fee", "Fee per side (%)")}` : s.mode === "spot" ? field("fee", "Fee per side (%)") : ""}
        </div></section>
        <section class="panel" id="out" aria-live="polite"></section>
      </div>
      <p class="note">Liquidation is an estimate for isolated margin with about 0.5% maintenance margin. Check your exchange for exact values.</p>`);
    calc();
  };
  const calc = () => {
    const n = (k) => parseFloat(String(s[k]).replace(",", "."));
    const bal = n("balance"), riskAmt = bal * n("risk") / 100, long = s.side === "long", out = ctx.view.querySelector("#out");
    if (!out) return;
    const row = (k, v, cls = "") => `<div class="result"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    let h = row("Money at risk", usd(riskAmt));
    if (s.mode === "forex") {
      const sym = s.pair, q = sym.slice(3), pip = sym === "XAUUSD" ? 0.1 : sym === "XAGUSD" ? 0.01 : q === "JPY" ? 0.01 : 0.0001;
      const contract = sym === "XAUUSD" ? 100 : sym === "XAGUSD" ? 5000 : 100000;
      let conv = 1;
      if (q !== "USD") { const p = rates[sym]; const usdq = rates["USD" + q]; const qusd = rates[q + "USD"]; conv = sym.startsWith("USD") && p ? 1 / p : qusd ? qusd : usdq ? 1 / usdq : NaN; }
      const pipLot = contract * pip * conv, lots = riskAmt / (n("pips") * pipLot);
      h += `<div class="result big"><span>Lot size</span><b>${isFinite(lots) ? num(lots, 2) : "--"}</b></div>` + row("Units", isFinite(lots) ? num(lots * contract, 0) : "--") + row("Pip value per lot", isFinite(pipLot) ? usd(pipLot) : "--") + row("Pip value for this size", isFinite(lots) ? usd(lots * pipLot) : "--");
      if (!isFinite(conv)) h += `<p class="note">Live rates are loading. Try again in a moment.</p>`;
    } else {
      const e = n("entry"), st = n("stop"), lev = s.mode === "crypto" ? Math.max(1, n("lev") || 1) : 1, fee = (n("fee") || 0) / 100;
      const dist = long ? e - st : st - e;
      if (!(dist > 0)) { out.innerHTML = h + `<p class="err">${long ? "For a long, the stop goes below the entry." : "For a short, the stop goes above the entry."}</p>`; return; }
      const qty = riskAmt / dist, notional = qty * e, margin = notional / lev, fees = notional * fee * 2;
      h += `<div class="result big"><span>Position size</span><b>${num(qty, qty >= 100 ? 2 : qty >= 1 ? 4 : 6)}</b></div>` + row("Position value", usd(notional)) + row(s.mode === "crypto" ? "Margin needed" : "Cost", usd(margin)) + (isPaid() ? row("Fees, in and out", usd(fees)) : "");
      if (margin > bal) h += `<p class="warn" style="margin:0">This needs more ${s.mode === "crypto" ? "margin" : "money"} than your balance. Lower the risk${s.mode === "crypto" ? " or raise the leverage carefully" : ""}.</p>`;
      if (!isPaid()) {
        h += String(lockedPreview("premium", "Pro: liquidation and fees", row("Estimated liquidation", "61,240.50", "down") + row("Fees, in and out", "$4.12")));
      } else if (s.mode === "crypto") {
        const liq = long ? e * (1 - 1 / lev + 0.005) : e * (1 + 1 / lev - 0.005);
        const bad = long ? st <= liq : st >= liq;
        h += row("Estimated liquidation", num(liq, e >= 100 ? 2 : 5), "down") + (bad ? `<p class="err" style="margin:0">Your stop is beyond the liquidation price. Lower the leverage.</p>` : "");
      }
      ["tp1", "tp2"].forEach((k, i) => {
        const t = n(k); if (!isFinite(t)) return;
        const w = long ? t - e : e - t; if (w <= 0) return;
        h += row("Target " + (i + 1) + ": reward", usd(qty * w - fees) + " (1:" + num(w / dist, 2) + ")", "up");
      });
    }
    out.innerHTML = h;
    store.set("riskPreset", s);
  };
  ctx.on("[data-k]", "input", (e) => { s[e.target.dataset.k] = e.target.value; calc(); });
  ctx.on("select[data-k]", "change", (e) => { s[e.target.dataset.k] = e.target.value; calc(); });
  ctx.on("[data-mode]", "click", (e, b) => { s.mode = b.dataset.mode; draw(); });
  ctx.on("[data-side]", "click", (e, b) => { s.side = b.dataset.side; draw(); });
  draw();
}
