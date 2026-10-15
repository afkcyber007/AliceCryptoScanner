/* Market scanner: every pair scored 0-100 on the chosen timeframe. */
import { html, api, session, plan, isPaid, go, qs, skeleton, errorBox, ago, store } from "../core.js";
import { MARKETS, setupRow } from "../components.js";

const TFS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"];
const FREE_TFS = ["1h", "4h", "1d"];
const FILTERS = [["all", "All"], ["breakout", "🔥 Breakout"], ["bullish", "📈 Bullish"], ["bearish", "📉 Bearish"], ["volume", "⚡ Volume"], ["breakdown", "🧊 Breakdown"]];

export default async function scanner(ctx) {
  let market = ctx.query.market || store.get("scanMarket", "crypto");
  let tf = ctx.query.tf || store.get("scanTf", "1h");
  if (!isPaid() && !FREE_TFS.includes(tf)) tf = "1h";
  let filter = "all", q = "", weakFirst = false, data = null, err = null, loading = false;
  ctx.top({ title: "Scanner", sub: "Every market scored 0 to 100" });

  const draw = () => {
    const paid = isPaid();
    let items = data ? data.items || [] : [];
    const needle = q.trim().toLowerCase();
    items = items.filter((it) => filter === "all" || (it.signals || []).includes(filter))
      .filter((it) => !needle || (it.display || "").toLowerCase().includes(needle) || (it.symbol || "").toLowerCase().includes(needle))
      .sort((a, b) => (weakFirst ? a.score - b.score : b.score - a.score));
    ctx.render(html`
      <div class="tabs" role="group" aria-label="Market">${MARKETS.map(([id, name]) => html`<button type="button" data-market="${id}" aria-pressed="${id === market}">${name}</button>`)}</div>
      <div class="tabs small" role="group" aria-label="Timeframe">${TFS.map((t) => html`<button type="button" data-tf="${t}" aria-pressed="${t === tf}" title="${!paid && !FREE_TFS.includes(t) ? "Premium" : ""}">${t.toUpperCase()}${!paid && !FREE_TFS.includes(t) ? " 🔒" : ""}</button>`)}</div>
      <div class="panel">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <input type="search" id="q" placeholder="Search, e.g. SOL, EURUSD, gold" value="${q}" style="flex:1;min-width:200px" aria-label="Search markets">
          <button class="btn btn-line btn-sm" type="button" data-sort>${weakFirst ? "Weakest first" : "Strongest first"}</button>
        </div>
        <div class="tabs small" style="margin-top:10px" role="group" aria-label="Signal">${FILTERS.map(([id, name]) => html`<button type="button" data-filter="${id}" aria-pressed="${id === filter}">${name}</button>`)}</div>
        <p class="note" style="margin:10px 0 0">${loading ? "Loading…" : data ? (data.warming ? "The scanner is warming up for this timeframe. Scores fill in over the next minutes." : "Updated " + ago(data.updated_at) + ", " + (data.items || []).length + " markets") : ""}</p>
        ${err && !data ? errorBox(err) : !data ? skeleton(8) : items.length ? html`<div class="list" style="margin-top:6px">${items.map((it) => setupRow(it, tf))}</div>`
          : html`<div class="empty"><b>No matches</b>Nothing matches this filter on ${tf.toUpperCase()}. Try another signal or timeframe.</div>`}
        ${data && data.locked ? html`<a class="banner upgrade" style="margin-top:12px" href="#/upgrade"><span class="emo">🔓</span><span><b>${data.locked} more markets are waiting</b><span class="muted">${market === "crypto" ? "Premium scans the top half of all crypto pairs, Elite scans every pair." : "Premium unlocks every forex pair, gold, oil, indices and US stocks."}</span></span><span class="btn btn-gold btn-sm">Unlock</span></a>` : ""}
      </div>
      <p class="note">Scores combine trend, momentum, volume, structure, breakouts and the higher timeframe. 65 and above lean bullish, 35 and below bearish. Not financial advice.</p>`);
    const input = ctx.view.querySelector("#q");
    if (input && document.activeElement !== input && q) { /* keep value */ }
  };

  const load = async () => {
    loading = true; err = null; draw();
    try { data = await api("/api/scan" + qs({ market, tf })); }
    catch (e) {
      if (e.code === "upgrade_required" || e.status === 402) { tf = "1h"; go("/upgrade?plan=premium"); return; }
      err = e;
    }
    loading = false; if (ctx.alive) draw();
  };

  ctx.on("[data-market]", "click", (e, b) => { market = b.dataset.market; store.set("scanMarket", market); filter = "all"; data = null; load(); });
  ctx.on("[data-tf]", "click", (e, b) => {
    const t = b.dataset.tf;
    if (!isPaid() && !FREE_TFS.includes(t)) { go("/upgrade?plan=premium"); return; }
    tf = t; store.set("scanTf", tf); data = null; load();
  });
  ctx.on("[data-filter]", "click", (e, b) => { filter = b.dataset.filter; draw(); });
  ctx.on("[data-sort]", "click", () => { weakFirst = !weakFirst; draw(); });
  ctx.on("#q", "input", (e) => {
    q = e.target.value; const pos = e.target.selectionStart; draw();
    const i = ctx.view.querySelector("#q"); i.focus(); try { i.setSelectionRange(pos, pos); } catch { }
  });
  await load();
  ctx.every(120000, load);
}
