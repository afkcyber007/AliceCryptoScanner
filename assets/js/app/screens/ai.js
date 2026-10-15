/* AI chart analyzer: upload a chart screenshot, or get a full report for any pair. */
import { html, raw, api, cached, session, isPaid, go, qs, price, skeleton, errorBox, needLogin, labelTag, store, toast, ago } from "../core.js";
import { MARKETS, md, sponsoredBreak, detailHref } from "../components.js";

export default async function ai(ctx) {
  ctx.top({ title: "AI chart analyzer", sub: "Analyze any pair or upload a chart" });
  let tab = ctx.query.symbol ? "pair" : store.get("aiTab", "pair");
  let market = ctx.query.market || "crypto", symbol = ctx.query.symbol || "BTCUSDT", tf = ctx.query.tf || "1h";
  let list = [], report = null, repErr = null, busy = false, quota = null, file = null, preview = "", chartRes = null, chartErr = null;
  const loadList = async () => { try { list = (await cached("/api/instruments?market=" + market, 600000, { auth: false })).items || []; } catch { list = []; } };
  const loadQuota = async () => { if (session.loggedIn) try { quota = await api("/api/quota"); } catch { } };

  const draw = () => {
    ctx.render(html`
      <div class="tabs" role="group"><button type="button" data-tab="pair" aria-pressed="${tab === "pair"}">Analyze a pair</button><button type="button" data-tab="upload" aria-pressed="${tab === "upload"}">Upload a chart</button></div>
      ${tab === "pair" ? pairHtml() : uploadHtml()}
      <p class="note">AI and automated analysis can be wrong. For education only, not financial advice.</p>`);
  };
  const pairHtml = () => html`
    <section class="panel"><div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="field"><label for="mk">Market</label><select id="mk">${MARKETS.map(([id, n]) => html`<option value="${id}" ${id === market ? raw("selected") : ""}>${n}</option>`)}</select></div>
      <div class="field"><label for="sy">Pair</label><select id="sy">${list.length ? list.map((i) => html`<option value="${i.symbol}" ${i.symbol === symbol ? raw("selected") : ""}>${i.display}</option>`) : html`<option>${symbol}</option>`}</select></div>
      <div class="field"><label for="tf">Timeframe</label><select id="tf">${["15m", "1h", "4h", "1d"].map((t) => html`<option value="${t}" ${t === tf ? raw("selected") : ""}>${t.toUpperCase()}</option>`)}</select></div>
    </div><button class="btn btn-gold" style="margin-top:14px" data-run ${busy ? raw("disabled") : ""}>${busy ? "Analyzing…" : "Analyze " + (list.find((i) => i.symbol === symbol) || { display: symbol }).display}</button>
    ${report && report.left_today != null && !isPaid() ? html`<p class="note" style="margin:10px 0 0">${report.left_today} free reports left today.</p>` : ""}</section>
    ${repErr ? repErrHtml(repErr) : busy ? skeleton(4, 80) : report ? reportHtml(report) : ""}`;
  const repErrHtml = (e) => {
    if (e.status === 401) return needLogin("the AI pair report");
    return html`<div class="panel"><p class="err mt0" style="margin:0">${e.message}</p>${e.status === 402 ? html`<div class="btn-row" style="margin-top:12px"><a class="btn btn-gold btn-sm" href="#/upgrade?plan=premium">Go Premium</a></div>` : ""}</div>`;
  };
  const reportHtml = (r) => html`
    <section class="panel"><div class="panel-head"><h2>${r.display}, ${String(r.tf).toUpperCase()}</h2>${labelTag(r.bias)}</div>
      <div class="kv"><div><small>Price</small><b>${r.price_fmt}</b></div><div><small>Alice score</small><b>${r.score} of 100</b></div></div>
      ${r.text ? html`<div class="prose-sm" style="margin-top:12px">${md(r.text)}</div>` : ""}
      <a class="btn btn-line btn-sm" style="margin-top:12px" href="${detailHref(r.market, r.symbol, r.tf)}">Open the chart</a></section>
    <div class="grid-2">${(r.sections || []).map((s) => html`<section class="panel"><div class="panel-head"><h2>${s.title}</h2>${s.premium ? html`<span class="tag sky">Premium</span>` : ""}</div>
      ${s.locked ? html`<p class="note mt0">Part of Premium. <a href="#/upgrade?plan=premium">Unlock</a></p>` : html`<ul class="prose-sm" style="margin:0;padding-left:18px">${s.lines.map((l) => html`<li>${l}</li>`)}</ul>`}</section>`)}</div>
    ${(r.news || []).length ? html`<section class="panel"><div class="panel-head"><h2>Related news</h2></div><div class="list">${r.news.map((n) => html`<a class="li" href="${n.link}" target="_blank" rel="noopener"><span><span class="t" style="white-space:normal">${n.title}</span><span class="s">${n.source}, ${ago(n.published_at)}</span></span></a>`)}</div></section>` : ""}
    ${r.disclaimer ? html`<p class="note">${r.disclaimer}</p>` : ""}`;

  const uploadHtml = () => {
    if (!session.loggedIn) return needLogin("the AI chart analyzer");
    const left = quota ? quota.ai_chart_left : null;
    return html`<section class="panel">
      ${quota && quota.ai_enabled === false ? html`<p class="warn" style="margin:0 0 10px">The AI chart analyzer is being set up on the server. It will be available soon.</p>` : ""}
      <label class="upload">${preview ? html`<img src="${preview}" alt="Your chart">` : html`<span style="font-size:30px">🖼️</span><b style="color:var(--text)">Choose a chart screenshot</b><span>PNG, JPG or WEBP, from TradingView, MT4/MT5 or your exchange</span>`}<input type="file" accept="image/*" id="file"></label>
      <div class="field" style="margin-top:12px"><label for="note">What do you want to know? (optional)</label><input id="note" maxlength="300" placeholder="e.g. Is this a good long entry?"></div>
      <div class="btn-row" style="margin-top:14px;align-items:center"><button class="btn btn-gold" data-analyze ${busy || !file ? raw("disabled") : ""}>${busy ? "Analyzing your chart…" : "Analyze chart"}</button>
        ${left != null ? html`<span class="note">${left} analysis${left === 1 ? "" : "es"} left today</span>` : ""}</div>
      ${chartErr ? html`<p class="err">${chartErr.message}</p>${chartErr.status === 402 ? html`<div class="btn-row" style="margin-top:10px">${chartErr.extra && chartErr.extra.rewarded ? html`<button class="btn btn-line btn-sm" data-bonus="ai_chart">Get 1 more free</button>` : ""}<a class="btn btn-gold btn-sm" href="#/upgrade?plan=premium">Go Premium</a></div>` : ""}` : ""}
    </section>
    ${busy ? skeleton(4, 60) : chartRes ? chartHtml(chartRes) : ""}`;
  };
  const chartHtml = (r) => {
    const x = r.result || {};
    const row = (k, v) => (v ? html`<div class="li" style="align-items:start"><span class="t">${k}</span><span class="r" style="white-space:normal;text-align:right;max-width:65%">${Array.isArray(v) ? v.join(", ") : v}</span></div>` : "");
    return html`<section class="panel"><div class="panel-head"><h2>${x.instrument || "Your chart"}${x.timeframe ? ", " + x.timeframe : ""}</h2>${x.bias ? labelTag(x.bias) : ""}</div>
      ${x.summary ? html`<p style="margin:0 0 10px">${x.summary}</p>` : ""}
      <div class="list">${row("Trend", x.trend)}${row("Structure", x.structure)}${row("Support", x.support)}${row("Resistance", x.resistance)}${row("Indicators", x.indicators)}${row("Patterns", x.patterns)}${row("Entry idea", x.entry_idea)}${row("Invalidation", x.invalidation)}${row("Risk to reward", x.risk_reward)}${row("Confidence", x.confidence)}</div>
      <p class="note" style="margin:10px 0 0">${r.disclaimer || ""}</p></section>`;
  };

  const runPair = async () => {
    busy = true; repErr = null; draw();
    try { report = await api("/api/ai/pair" + qs({ market, symbol, tf })); } catch (e) { repErr = e; report = null; }
    busy = false; if (ctx.alive) draw();
  };
  ctx.on("[data-tab]", "click", async (e, b) => { tab = b.dataset.tab; store.set("aiTab", tab); if (tab === "upload") await loadQuota(); draw(); });
  ctx.on("#mk", "change", async (e) => { market = e.target.value; await loadList(); symbol = (list[0] || { symbol }).symbol; report = null; draw(); });
  ctx.on("#sy", "change", (e) => { symbol = e.target.value; report = null; draw(); });
  ctx.on("#tf", "change", (e) => { tf = e.target.value; report = null; draw(); });
  ctx.on("[data-run]", "click", runPair);
  ctx.on("#file", "change", (e) => {
    file = e.target.files && e.target.files[0]; chartErr = null; chartRes = null;
    if (file && file.size > 10 * 1024 * 1024) { toast("Please choose an image under 10 MB"); file = null; }
    if (preview) URL.revokeObjectURL(preview);
    preview = file ? URL.createObjectURL(file) : ""; draw();
  });
  ctx.on("[data-analyze]", "click", async () => {
    if (!file) return;
    busy = true; chartErr = null; draw();
    const fd = new FormData(); fd.append("image", file); fd.append("note", (ctx.view.querySelector("#note") || {}).value || "");
    try { chartRes = await api("/api/ai/chart", { method: "POST", form: fd, timeout: 90000 }); quota = chartRes.quota || quota; } catch (e) { chartErr = e; }
    busy = false; if (ctx.alive) draw();
  });
  ctx.on("[data-bonus]", "click", async (e, b) => {
    await sponsoredBreak(6, "Unlocking one more analysis");
    try { quota = await api("/api/quota/reward", { method: "POST", body: { kind: b.dataset.bonus } }); chartErr = null; toast("One more analysis unlocked"); } catch (ex) { toast(ex.message); }
    draw();
  });
  ctx.cleanup(() => { if (preview) URL.revokeObjectURL(preview); });
  await loadList(); if (tab === "upload") await loadQuota();
  draw();
  if (ctx.query.symbol) runPair();
}
