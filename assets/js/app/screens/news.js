/* Market news and the economic calendar. */
import { A, html, raw, api, session, isPaid, qs, ago, dateTime, toMs, skeleton, errorBox, toast } from "../core.js";
import { md } from "../components.js";

export async function news(ctx) {
  ctx.top({ title: "Market news", sub: "Crypto, forex, gold and US stocks" });
  let cat = ctx.query.cat || "crypto", range = "all", d = null, err = null;
  const draw = () => ctx.render(html`
    <div class="tabs" role="group">${[["crypto", "Crypto"], ["forex", "Forex"], ["gold", "Gold and commodities"], ["stocks", "US stocks"]].map(([id, n]) => html`<button type="button" data-cat="${id}" aria-pressed="${id === cat}">${n}</button>`)}</div>
    <div class="tabs small" role="group">${[["all", "Latest"], ["today", "Today"], ["week", "This week"], ["prev_week", "Last week"], ["month", "This month"]].map(([id, n]) => html`<button type="button" data-range="${id}" aria-pressed="${id === range}">${n}</button>`)}</div>
    <section class="panel">${err ? errorBox(err) : !d ? skeleton(8) : !(d.items || []).length ? html`<div class="empty"><b>No headlines right now</b>The news feeds are refreshing. Try again in a few minutes.</div>`
      : html`<div class="list">${d.items.map((n) => html`<a class="li" href="${(A.base || "/") + "news/read/?id=" + n.id}" style="grid-template-columns:${n.image ? "72px " : ""}minmax(0,1fr)">
        ${n.image ? html`<img src="${n.image}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:72px;height:52px;object-fit:cover;border-radius:10px">` : ""}
        <span><span class="t" style="white-space:normal;line-height:1.35">${n.impact >= 3 ? html`<span class="tag bear" style="margin-right:6px">High impact</span>` : ""}${n.title}</span><span class="s">${n.source}, ${ago(n.published_at)}</span></span></a>`)}</div>`}
    </section>${d && d.source_note ? html`<p class="note">${d.source_note}</p>` : ""}`);
  const load = async () => { try { d = await api("/api/news" + qs({ cat, range }), { auth: false }); err = null; } catch (e) { err = e; } if (ctx.alive) draw(); };
  ctx.on("[data-cat]", "click", (e, b) => { cat = b.dataset.cat; d = null; draw(); load(); });
  ctx.on("[data-range]", "click", (e, b) => { range = b.dataset.range; d = null; draw(); load(); });
  draw(); await load(); ctx.every(180000, load);
}

export async function calendar(ctx) {
  ctx.top({ title: "Economic calendar", sub: "Times in your time zone" });
  let range = "", impact = "high", d = null, err = null, cur = "";
  const ai = {};
  const draw = () => {
    let ev = d ? d.events || [] : [];
    if (impact === "high") ev = ev.filter((e) => /high/i.test(e.impact));
    else if (impact === "medium") ev = ev.filter((e) => /high|medium/i.test(e.impact));
    if (cur) ev = ev.filter((e) => e.currency === cur);
    const currencies = d ? [...new Set((d.events || []).map((e) => e.currency))].sort() : [];
    const byDay = {};
    ev.forEach((e) => { const k = new Date(toMs(e.time)).toDateString(); (byDay[k] = byDay[k] || []).push(e); });
    ctx.render(html`
      <div class="tabs" role="group">${[["", "This and next week"], ["today", "Today"], ["week", "This week"], ["next_week", "Next week"], ["prev_week", "Last week"]].map(([id, n]) => html`<button type="button" data-range="${id}" aria-pressed="${id === range}">${n}</button>`)}</div>
      <div class="tabs small" role="group"><button type="button" data-imp="high" aria-pressed="${impact === "high"}">High impact</button><button type="button" data-imp="medium" aria-pressed="${impact === "medium"}">High and medium</button><button type="button" data-imp="all" aria-pressed="${impact === "all"}">All</button>
        <select data-cur style="width:auto;min-height:36px;margin-left:4px" aria-label="Currency"><option value="">All currencies</option>${currencies.map((c) => html`<option ${c === cur ? raw("selected") : ""}>${c}</option>`)}</select></div>
      ${err ? errorBox(err) : !d ? skeleton(8) : !ev.length ? html`<div class="panel"><div class="empty"><b>No events</b>Nothing matches these filters.</div></div>`
        : Object.entries(byDay).map(([day, list]) => html`<section class="panel"><div class="panel-head"><h2>${new Date(day).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</h2></div><div class="list">
          ${list.map((e) => html`<details class="li" style="display:block">
            <summary style="display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:10px;align-items:center;cursor:pointer;list-style:none">
              <span class="note">${dateTime(e.time, { hour: "2-digit", minute: "2-digit" })}</span>
              <span style="min-width:0"><span class="t" style="white-space:normal"><span class="impact ${String(e.impact).toLowerCase()}"></span><b>${e.currency}</b> ${e.title}</span><span class="s">Forecast ${e.forecast || "--"}, previous ${e.previous || "--"}</span></span>
              <span class="r">${toMs(e.time) < Date.now() ? html`<span class="tag">Done</span>` : ""}</span></summary>
            ${e.scenario ? html`<div class="prose-sm" style="padding:10px 0 4px 66px">
              ${e.scenario.summary ? html`<p>${e.scenario.summary}</p>` : ""}
              ${scen("If higher than forecast", e.scenario.above || e.scenario.hawkish)}${scen("If lower than forecast", e.scenario.below || e.scenario.dovish)}
              ${e.scenario.volatility ? html`<p class="note">${e.scenario.volatility}</p>` : ""}
              ${ai[e.id] ? html`<div class="panel" style="margin-top:8px">${md(ai[e.id])}</div>` : e.ai_available ? html`<button class="btn btn-line btn-sm" data-ai="${e.id}">AI impact analysis</button>` : !isPaid() ? html`<p class="note"><a href="#/upgrade?plan=premium">Premium</a> adds an AI impact analysis for every key event.</p>` : ""}
            </div>` : ""}
          </details>`)}</div></section>`)}
      ${d ? html`<p class="note">${d.source_note.replace("All times in UTC.", "Times shown in your time zone.")}</p>` : ""}`);
  };
  const scen = (title, m) => (m ? html`<p><b>${title}:</b> ${Object.entries(m).map(([k, v]) => k + " " + v).join(", ")}</p>` : "");
  const load = async () => { try { d = await api("/api/calendar" + qs({ range })); err = null; } catch (e) { err = e; } if (ctx.alive) draw(); };
  ctx.on("[data-range]", "click", (e, b) => { range = b.dataset.range; d = null; draw(); load(); });
  ctx.on("[data-imp]", "click", (e, b) => { impact = b.dataset.imp; draw(); });
  ctx.on("[data-cur]", "change", (e) => { cur = e.target.value; draw(); });
  ctx.on("[data-ai]", "click", async (e, b) => {
    b.disabled = true; b.textContent = "Analyzing…";
    try { const r = await api("/api/calendar/" + encodeURIComponent(b.dataset.ai) + "/ai"); ai[b.dataset.ai] = r.text; const box = document.createElement("div"); box.className = "panel"; box.style.marginTop = "8px"; box.innerHTML = String(md(r.text)); b.replaceWith(box); }
    catch (ex) { toast(ex.message); b.disabled = false; b.textContent = "AI impact analysis"; }
  });
  draw(); await load();
}
