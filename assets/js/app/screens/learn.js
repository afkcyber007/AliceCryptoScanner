/* Trading academy, trader stories and recommended exchanges. */
import { API, html, raw, api, cached, session, isPaid, qs, skeleton, errorBox, gate, icon } from "../core.js";
import { md } from "../components.js";
import { drawChart } from "../chart.js";

export async function academy(ctx) {
  ctx.top({ title: "Trading academy", sub: "Forex, crypto, gold and smart money concepts" });
  ctx.render(skeleton(6));
  let d;
  try { d = await api("/api/course"); } catch (e) { ctx.render(errorBox(e)); return; }
  const done = new Set(JSON.parse(localStorage.getItem("alice.lessonsDone") || "[]"));
  ctx.render(html`
    <section class="panel"><h2 style="font-size:20px;margin:0 0 4px">${d.title}</h2><p class="note mt0" style="margin:0">${d.lessons} lessons. ${done.size} completed.${d.paid ? "" : " The first lessons are free, the rest come with Premium."}</p></section>
    ${(d.modules || []).map((m) => html`<section class="panel"><div class="panel-head"><h2>${m.title.replace(/^\d+\s·\s/, "")}</h2><span class="note">Module ${m.order || ""}</span></div><div class="list">
      ${m.lessons.map((l) => html`<a class="li" href="#/lesson/${l.id}"><span class="with-ic"><span class="lead-ic">${done.has(l.id) ? "✅" : l.locked ? "🔒" : "📘"}</span><span><span class="t">${l.title}</span><span class="s">${l.summary}</span></span></span>
        <span class="r">${l.free ? html`<span class="tag bull">Free</span>` : l.locked ? html`<span class="tag sky">Premium</span>` : ""}<small class="muted">${l.minutes} min</small></span></a>`)}</div></section>`)}`);
}

export async function lesson(ctx) {
  ctx.top({ title: "Lesson" });
  ctx.render(skeleton(1, 60) + skeleton(6, 24));
  let l;
  try { l = await api("/api/course/" + encodeURIComponent(ctx.params.id)); }
  catch (e) {
    if (e.status === 402) {
      ctx.top({ title: e.extra.title || "Lesson" });
      ctx.render(html`${e.extra.preview ? html`<article class="panel"><div class="prose-sm" style="font-size:16px">${md(e.extra.preview)}</div></article>` : ""}
        ${gate("premium", "Keep reading with Premium", "This lesson is part of the Premium course. Unlock the full trading academy, including the Pro module.", ["48 lessons from beginner to pro", "Live chart examples", "Smart money concepts and advanced strategies"])}`);
      return;
    }
    ctx.render(errorBox(e)); return;
  }
  ctx.top({ title: l.title, sub: l.module.replace(/^\d+\s·\s/, "") });
  const body = String(l.body || "").replace(/\]\(img\//g, "](" + API + "/static/course/");
  ctx.render(html`<article class="panel lesson-body">
      <p class="note mt0">${l.minutes} min read</p>
      <div class="prose-sm" style="font-size:16px">${md(body)}</div>
    </article>
    ${l.chart ? html`<section class="panel"><div class="panel-head"><h2>Live example</h2><span class="note">${l.chart.symbol} ${String(l.chart.tf).toUpperCase()}</span></div><div class="chart-wrap" id="lc"></div><p class="note">${l.chart_caption || ""}</p></section>` : ""}
    <div class="btn-row"><button class="btn btn-gold" data-done>Mark as done</button><a class="btn btn-line" href="#/academy">All lessons</a></div>`);
  ctx.on("[data-done]", "click", () => {
    const done = new Set(JSON.parse(localStorage.getItem("alice.lessonsDone") || "[]")); done.add(l.id);
    try { localStorage.setItem("alice.lessonsDone", JSON.stringify([...done])); } catch { }
    location.hash = "#/academy";
  });
  if (l.chart) {
    try {
      const d = await api("/api/instrument" + qs({ market: l.chart.market, symbol: l.chart.symbol, tf: l.chart.tf }));
      if (!ctx.alive) return;
      const ov = l.chart.overlays || [];
      const stop = drawChart(ctx.view.querySelector("#lc"), d.candles, { market: l.chart.market, symbol: l.chart.symbol, zones: ov.includes("sr") ? d.zones : null, fib: ov.includes("fib") ? d.fibonacci : null, emas: ov.includes("ema") ? [21, 50, 200] : [] });
      ctx.cleanup(stop);
    } catch { const el = ctx.view.querySelector("#lc"); if (el) el.outerHTML = '<p class="note">The live chart example needs Premium for this timeframe.</p>'; }
  }
}

export async function stories(ctx) {
  ctx.top({ title: "Trader stories", sub: "Real journeys of famous traders" });
  ctx.render(skeleton(6, 70));
  let d;
  try { d = await api("/api/stories?lang=en"); } catch (e) { ctx.render(errorBox(e)); return; }
  ctx.render(html`${d.paid ? "" : html`<a class="banner upgrade" href="#/upgrade?plan=premium"><span class="emo">📖</span><span><b>${d.free_count} story free, all of them with Premium</b><span class="muted">Learn from the wins and mistakes of legendary traders.</span></span><span class="btn btn-gold btn-sm">Unlock</span></a>`}
    <section class="panel"><div class="list">${d.items.map((s) => html`<a class="li" href="#/story/${s.id}"><span class="with-ic"><span class="lead-ic">${s.emoji}</span><span><span class="t">${s.name}</span><span class="s">${s.era}, ${s.market}</span><span class="s" style="white-space:normal;margin-top:2px">${s.teaser}</span></span></span><span class="r">${s.locked ? html`<span class="tag sky">Premium</span>` : ""}</span></a>`)}</div></section>`);
}

export async function story(ctx) {
  ctx.top({ title: "Trader story" });
  ctx.render(skeleton(8, 24));
  let s;
  try { s = await api("/api/stories/" + encodeURIComponent(ctx.params.id) + "?lang=en"); }
  catch (e) {
    if (e.status === 402) { ctx.render(gate("premium", e.extra.title || "This story is part of Premium", e.extra.preview || "", ["Every trader story", "The full trading academy", "Every market and timeframe in the scanner"])); return; }
    ctx.render(errorBox(e)); return;
  }
  ctx.top({ title: s.name, sub: s.era });
  if (s.locked) { ctx.render(gate("premium", s.title, s.teaser, ["Every trader story", "The full trading academy", "Every market and timeframe in the scanner"])); return; }
  ctx.render(html`<article class="panel"><h2 style="font-size:21px;margin:0 0 10px">${s.emoji} ${s.title}</h2><div class="prose-sm" style="font-size:16px">${md(s.story)}</div>
    ${s.lesson ? html`<div class="callout" style="margin-top:16px"><b>The lesson for traders</b>${md(s.lesson)}</div>` : ""}</article>
    <a class="btn btn-line" href="#/stories">All stories</a>`);
}

export async function exchanges(ctx) {
  ctx.top({ title: "Best exchange and brokers", sub: "Recommended by Alice" });
  ctx.render(skeleton(4, 120));
  let d;
  try { d = await cached("/api/exchanges", 600000, { auth: false }); } catch (e) { ctx.render(errorBox(e)); return; }
  const fa = d.free_access;
  ctx.render(html`
    ${fa ? html`<section class="panel" style="border-color:rgba(22,199,132,.5);background:linear-gradient(180deg,rgba(22,199,132,.1),var(--s1))"><h2 style="font-size:18px;margin:0 0 6px">${fa.title}</h2><p style="margin:0 0 12px">${fa.text}</p><a class="btn btn-gold btn-sm" href="${fa.url}" target="_blank" rel="noopener">${fa.button}</a></section>` : ""}
    <p class="note">${d.note}</p>
    <div class="grid-2">${(d.items || []).map((x) => html`<section class="panel" style="border-top:3px solid ${x.color}">
      <div class="panel-head"><h2>${x.name}</h2><span class="tag ${x.category === "crypto" ? "gold" : "sky"}">${x.category === "crypto" ? "Crypto" : "Forex"}</span></div>
      ${x.badge ? html`<p style="margin:0 0 6px;font-weight:600">${x.badge}</p>` : ""}
      <p class="mt0" style="margin:0 0 10px;color:#C3CAD8">${x.fee_highlight}</p>
      <ul class="feat-list" style="margin-bottom:14px">${(x.features || []).map((f) => html`<li>${icon.check}<span>${f}</span></li>`)}</ul>
      <a class="btn btn-gold btn-sm" href="${x.url}" target="_blank" rel="noopener sponsored">Open ${x.name} ${icon.ext}</a></section>`)}</div>
    <p class="note">${d.disclosure}</p>`);
}
