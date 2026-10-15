/* Gold and BTC deep analysis (Elite, 7-day free trial for every account). */
import { html, api, session, num, pct, upDown, ago, dateTime, skeleton, errorBox, gate, needLogin, labelTag, toMs } from "../core.js";
import { partsBars } from "../components.js";

const PART = { technicals: "Technicals", intermarket: "Dollar, yields, stocks", history: "History", events: "Events", headlines: "Headlines", positioning: "Futures and whales" };

export const gold = (ctx) => deep(ctx, "gold");
export const btc = (ctx) => deep(ctx, "btc");

async function deep(ctx, asset) {
  const name = asset === "gold" ? "Gold" : "Bitcoin";
  ctx.top({ title: name + " deep analysis", sub: "Elite, 7-day free trial" });
  if (!session.loggedIn) {
    ctx.render(html`${needLogin("the " + name + " deep analysis")}<p class="note center">Every account gets a 7-day free trial.</p>`);
    return;
  }
  ctx.render(skeleton(1, 140) + skeleton(5, 70));
  let r;
  try { r = await api(asset === "gold" ? "/api/gold/deep" : "/api/btc/deep"); }
  catch (e) {
    if (e.status === 402) {
      ctx.render(gate("elite", "Your free trial has ended", e.message, ["Daily bullish or bearish verdict with confidence", "Trade plan with entry, stop and two targets",
        "Dollar, yields, stocks and correlations", "Upcoming events and how " + name.toLowerCase() + " reacted before", "Headlines scored for " + name.toLowerCase()]));
      return;
    }
    ctx.render(errorBox(e)); return;
  }
  const v = (r.verdict || "neutral").toLowerCase();
  const cls = v.includes("bull") ? "bull" : v.includes("bear") ? "bear" : "neutral";
  const pl = r.plan || {}, tech = r.technicals || {}, inter = r.intermarket || {}, ev = r.events || {}, hd = r.headlines || {}, hist = r.history || {}, tr = r.track_record || {}, pos = r.positioning;
  ctx.render(html`
    ${r.trial && r.trial.active ? html`<div class="panel" style="border-color:rgba(245,185,65,.45)"><b>Free trial: ${r.trial.days_left} day${r.trial.days_left === 1 ? "" : "s"} left</b><p class="note" style="margin:4px 0 10px">Keep the daily verdicts and trade plans with Elite.</p><a class="btn btn-gold btn-sm" href="#/upgrade?plan=elite">Upgrade to Elite</a></div>` : ""}
    <section class="verdict ${cls}">
      <div class="note">${name} verdict for today</div>
      <div class="v ${cls === "bull" ? "up" : cls === "bear" ? "down" : ""}">${r.verdict_label || r.verdict}</div>
      <div class="s">Score ${num(r.score, 0)} of 100, confidence ${num(r.confidence, 0)}%. Updated ${ago(r.updated_at)}.</div>
    </section>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>What makes up the verdict</h2></div>${partsBars(r.parts || {}, PART)}</section>
      <section class="panel"><div class="panel-head"><h2>Main reasons</h2></div><ul class="prose-sm" style="margin:0;padding-left:18px">${(r.reasons || []).slice(0, 7).map((x) => html`<li style="margin-bottom:6px">${x}</li>`)}</ul></section>
    </div>
    <section class="panel"><div class="panel-head"><h2>Trade plan</h2>${pl.zone ? html`<span class="tag">${pl.zone}</span>` : ""}</div>
      ${pl.locked ? html`<p class="note">The trade plan is part of Elite.</p>` : html`
      <p style="margin:0 0 12px">${pl.idea || ""}</p>
      <div class="kv"><div><small>Price</small><b>${pl.price_fmt}</b></div><div><small>Entry</small><b>${pl.entry_fmt}</b></div><div><small>Stop loss</small><b class="down">${pl.sl_fmt}</b></div>
        <div><small>Target 1</small><b class="up">${pl.tp1_fmt}</b></div><div><small>Target 2</small><b class="up">${pl.tp2_fmt}</b></div><div><small>ATR</small><b>${pl.atr_fmt}</b></div></div>
      ${pl.pivots && Object.keys(pl.pivots).length ? html`<p class="note" style="margin:12px 0 4px">Daily pivots</p><div class="kv">${Object.entries(pl.pivots).map(([k, x]) => html`<div><small>${k}</small><b>${x}</b></div>`)}</div>` : ""}`}
    </section>
    <section class="panel"><div class="panel-head"><h2>Technicals on every timeframe</h2><span class="note">Score ${num(tech.score, 0)}</span></div>
      <div class="list">${(tech.rows || []).map((x) => html`<div class="li"><span><span class="t">${String(x.tf).toUpperCase()}</span><span class="s">RSI ${num(x.rsi, 0)}, ${x.structure}, ${x.above_ema50 ? "above" : "below"} EMA 50</span></span><span class="r">${labelTag(x.trend)} <b style="margin-left:8px">${x.score}</b></span></div>`)}</div></section>
    <section class="panel"><div class="panel-head"><h2>${asset === "gold" ? "Dollar, yields and other markets" : "Stocks, dollar and other markets"}</h2><span class="note">Score ${num(inter.score, 0)}</span></div>
      <div class="list">${(inter.items || []).map((m) => html`<div class="li" style="align-items:start"><span><span class="t">${m.name}</span><span class="s" style="white-space:normal">${m.why}</span></span>
        <span class="r">${m.price_fmt}<small class="${upDown(m.change5d)}">${pct(m.change5d)} 5d</small><small>${labelTag(m.impact)}</small></span></div>`)}</div></section>
    ${pos ? html`<section class="panel"><div class="panel-head"><h2>Futures and whales</h2><span class="note">Score ${num(pos.score, 0)}</span></div>
      <div class="list">${(pos.items || []).map((x) => html`<div class="li"><span><span class="t">${x.name}</span><span class="s" style="white-space:normal">${x.text}</span></span><span class="r">${labelTag(x.effect)}</span></div>`)}</div></section>` : ""}
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Upcoming events</h2>${ev.risk_24h ? html`<span class="tag bear">High risk in 24h</span>` : ""}</div>
        ${(ev.items || []).length ? html`<div class="list">${ev.items.map((e) => html`<div class="li" style="align-items:start"><span><span class="t"><span class="impact ${String(e.impact).toLowerCase()}"></span>${e.title}</span><span class="s" style="white-space:normal">${e.gold_effect || e.expectation || ""}</span></span><span class="r note">${dateTime(e.time)}</span></div>`)}</div>` : html`<p class="note mt0">No high-impact events in the next days.</p>`}
        ${ev.past && ev.past.summary ? html`<p class="note">${ev.past.summary}</p>` : ""}</section>
      <section class="panel"><div class="panel-head"><h2>Headlines</h2><span class="note">${hd.bullish || 0} bullish, ${hd.bearish || 0} bearish</span></div>
        ${(hd.items || []).length ? html`<div class="list">${hd.items.slice(0, 6).map((h) => html`<div class="li"><span><span class="t" style="white-space:normal">${h.title}</span><span class="s">${h.source}, ${ago(h.published_at)}</span></span><span class="r">${labelTag(h.tone)}</span></div>`)}</div>` : html`<p class="note mt0">No scored headlines right now.</p>`}</section>
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>What history says</h2></div><p class="mt0" style="margin:0">${hist.locked ? "Part of Elite." : hist.text || "Not enough history yet."}</p></section>
      <section class="panel"><div class="panel-head"><h2>Track record</h2></div>
        ${tr.graded ? html`<p style="margin:0 0 8px">${tr.wins} of ${tr.graded} recent verdicts were right${tr.accuracy != null ? " (" + num(tr.accuracy, 0) + "%)" : ""}.</p>
          <div class="list">${(tr.recent || []).slice(0, 6).map((x) => html`<div class="li"><span class="t">${x.day}</span><span class="r">${labelTag(x.verdict)} <span class="${x.result === "win" ? "up" : "down"}" style="margin-left:6px">${pct(x.change_pct)}</span></span></div>`)}</div>` : html`<p class="note mt0">Verdicts are graded after each day. The record builds up over the next days.</p>`}</section>
    </div>
    <p class="note">${r.disclaimer || "Analysis for education only, not financial advice."}</p>`);
}
