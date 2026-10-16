/* Home: prices, offers, discussion rooms, shortcuts, market pulse, top setups, events and heatmap. */
import { A, html, raw, api, cached, session, plan, isPaid, price, pct, upDown, toMs, dateTime, icon, skeleton, errorBox, loadConfig, ago } from "../core.js";
import { lang } from "../i18n.js";
import { MARKETS, setupRow, quoteCard, offerBox, tickOffers, promoBox, wirePromo, detailHref } from "../components.js";

export default async function home(ctx) {
  const u = session.user;
  const first = u && u.name ? u.name.split(" ")[0] : "trader";
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  ctx.top({ title: "Home", sub: "Alice Forex/Crypto Scanner" });
  let market = "crypto";
  let ov = null, brief = null, events = [], notes = [];

  const draw = () => {
    const cfg = session.config || {};
    const p = plan();
    const setups = ov ? (ov.setups || {})[market] || [] : [];
    const s = (ov && ov.sentiment) || (brief && brief.sentiment) || null;
    ctx.render(html`
      <div class="greet"><div><h2>${hello}, ${first}</h2><p>${ov ? "Markets updated " + ago(ov.updated_at) : "Loading the markets…"}</p></div>
        <span class="btn-row" style="gap:8px;margin:0;flex-wrap:nowrap"><a class="lang-chip" href="#/language" aria-label="Language">${icon.globe}${lang.toUpperCase()}</a>${u ? "" : html`<a class="btn btn-gold btn-sm" href="#/signup">Sign up free</a>`}</span></div>

      ${notes.length ? html`<div class="panel" style="border-color:rgba(59,167,255,.4)">${notes.slice(0, 1).map((n) => html`<b>${n.title}</b><p class="muted mt0" style="margin:4px 0 0">${n.body}</p>`)}</div>` : ""}

      <div class="row-scroll">${ov ? (ov.quotes || []).map(quoteCard) : raw('<div class="skel" style="height:78px;width:100%"></div>')}</div>

      ${offerBox(cfg.offer)}
      ${promoBox(cfg.promo)}

      <section>
        <div class="panel-head" style="margin-bottom:10px"><h2 style="font-size:18px;color:var(--gold)">Market discussion rooms</h2><span class="note">Join traders live</span></div>
        <div class="rooms">
          <a class="room crypto" href="#/chat/crypto"><span class="live">Live</span><b>Crypto</b><span>Discussion</span></a>
          <a class="room forex" href="#/chat/forex"><span class="live">Live</span><b>Forex and gold</b><span>Discussion</span></a>
        </div>
      </section>

      <div class="tiles">
        <a class="tile gold" href="#/best"><span class="emo">🏆</span><b>Best Trades today</b><span>${p === "elite" ? "Top setups in every market" : "Elite: top setups, entry and targets"}</span></a>
        <a class="tile dark" href="#/activity"><span class="emo">🐋</span><b>Whale radar</b><span>Big orders, pumps and dumps</span></a>
        <a class="tile blue" href="#/ai"><span class="emo">🤖</span><b>AI chart analyzer</b><span>Analyze any pair or screenshot</span></a>
        <a class="tile violet" href="#/strength"><span class="emo">⏰</span><b>Market hours</b><span>Sessions and currency strength</span></a>
      </div>

      <a class="banner gold" href="#/gold"><span class="emo">🥇</span><span><b>Gold deep analysis</b><span>Dollar, yields, events and news in one verdict. Elite, 7-day free trial.</span></span><span aria-hidden="true">${icon.chev}</span></a>
      <a class="banner btc" href="#/btc"><span class="emo">₿</span><span><b>BTC deep analysis</b><span>Stocks, dollar, futures, whales and news. Elite, 7-day free trial.</span></span><span aria-hidden="true">${icon.chev}</span></a>
      <a class="banner spin" href="#/spin"><span class="emo">🎡</span><span><b>Spin and earn Premium free</b><span>Spin daily and invite friends. Coins turn into Premium and Elite.</span></span><span aria-hidden="true">${icon.chev}</span></a>
      <a class="banner channel" href="${A.channel || "https://t.me/AliceCryptoPro_Official"}" target="_blank" rel="noopener"><span class="emo">📣</span><span><b>Free daily analysis on Telegram</b><span>Gold, BTC and forex outlook every day from the Alice team.</span></span><span class="btn btn-sm btn-tg">Join</span></a>
      <a class="banner exch" href="#/exchanges"><span class="emo">🏦</span><span><b>Best exchanges and brokers</b><span>Sign-up bonuses, low fees, and free Premium or Elite when you join with our link.</span></span><span aria-hidden="true">${icon.chev}</span></a>

      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h2>Market pulse</h2>${brief && brief.btc_trend ? html`<span class="tag ${/bull/i.test(brief.btc_trend) ? "bull" : /bear/i.test(brief.btc_trend) ? "bear" : ""}">BTC 4H ${brief.btc_trend}</span>` : ""}</div>
          ${s ? html`<div class="bigscore"><span class="n ${s.value >= 55 ? "up" : s.value <= 45 ? "down" : ""}">${s.value}</span><span class="l">${s.label}</span><div class="track"><i style="left:${Math.max(2, Math.min(98, s.value))}%"></i></div></div>
            <p class="note" style="margin:10px 0 0">${s.advancers} up and ${s.decliners} down among the top coins over 24 hours.${brief && brief.btc_support ? " BTC 4H support near " + price(brief.btc_support, "crypto") + "." : ""}${brief && brief.btc_resistance ? " Resistance near " + price(brief.btc_resistance, "crypto") + "." : ""}</p>` : skeleton(2, 40)}
        </section>
        <section class="panel">
          <div class="panel-head"><h2>High-impact events</h2><a href="#/calendar">All</a></div>
          ${events.length ? html`<div class="list">${events.slice(0, 5).map((e) => html`<a class="li" href="#/calendar"><span><span class="t"><span class="impact high"></span>${e.currency} ${e.title}</span></span><span class="r note">${dateTime(e.time, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></a>`)}</div>`
            : html`<p class="note" style="margin:0">No high-impact events in the next days.</p>`}
        </section>
      </div>

      ${p === "free" ? html`<a class="banner upgrade" href="#/upgrade"><span class="emo">⭐</span><span><b>Unlock Best Trades and the full scanner</b><span class="muted">No ads, every market and timeframe, AI analyzer, full academy</span></span><span class="btn btn-gold btn-sm">Upgrade</span></a>` : ""}

      <section class="panel">
        <div class="panel-head"><h2>Top setups, 1 hour</h2><a href="#/scanner?market=${market}">Open scanner</a></div>
        <div class="tabs small" role="group" aria-label="Market" style="margin-bottom:6px">${MARKETS.map(([id, name]) => html`<button type="button" data-market="${id}" aria-pressed="${id === market}">${name}</button>`)}</div>
        ${ov ? (setups.length ? html`<div class="list">${setups.slice(0, 8).map((x) => setupRow(x, "1h"))}</div>` : html`<p class="note">Scanning the market. Results appear in a moment.</p>`) : skeleton(5)}
      </section>

      ${ov && (ov.heatmap || []).length ? html`<section class="panel"><div class="panel-head"><h2>Crypto heatmap, 24 hours</h2></div>
        <div class="heat">${ov.heatmap.slice(0, 30).map((t) => {
          const c = Math.max(-8, Math.min(8, t.change24h)); const a = 0.25 + Math.abs(c) / 8 * 0.65;
          const bg = c >= 0 ? `rgba(22,199,132,${a})` : `rgba(234,57,67,${a})`;
          return html`<a href="${detailHref("crypto", t.symbol)}" style="background:${bg}"><b>${t.base}</b>${pct(t.change24h, 1)}</a>`;
        })}</div></section>` : ""}

      <p class="note center">Market data and analysis for education only, not financial advice.</p>
    `);
    tickOffers(ctx.view); wirePromo(ctx.view);
  };

  ctx.on("[data-market]", "click", (e, b) => { market = b.dataset.market; draw(); });
  draw();
  const load = async () => {
    const [o, b, c, a] = await Promise.allSettled([
      api("/api/markets/overview", { auth: false }), cached("/api/market/brief", 300000), cached("/api/calendar", 600000), cached("/api/announcements?client=web", 600000),
    ]);
    if (o.status === "fulfilled") ov = o.value;
    else if (!ov) { ctx.render(errorBox(o.reason)); return; }
    if (b.status === "fulfilled") brief = b.value;
    if (c.status === "fulfilled") events = (c.value.events || []).filter((e) => /high/i.test(e.impact) && toMs(e.time) > Date.now() - 3600e3).sort((x, y) => toMs(x.time) - toMs(y.time));
    if (a.status === "fulfilled") notes = (a.value.items || []).filter((n) => toMs(n.created_at) > Date.now() - 3 * 864e5);
    if (ctx.alive) draw();
  };
  await load();
  ctx.every(60000, load);
  ctx.every(1000, () => tickOffers(ctx.view));
  ctx.every(180000, () => loadConfig(true).then(draw));
}
