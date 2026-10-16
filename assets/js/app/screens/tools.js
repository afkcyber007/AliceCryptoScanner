/* Tools hub, the same toolkit as the Android app. */
import { A, html, plan, icon } from "../core.js";

const GROUPS = [
  ["Earn", [
    ["🎡", "Spin, play and earn Premium free", "Spin daily and collect coins", "#/spin"],
    ["🤝", "Rewards and referral", "Invite friends and convert coins", "#/rewards"],
  ]],
  ["Elite insights", [
    ["🏆", "Best Trades", "Top setups in every market", "#/best", "elite"],
    ["🐋", "Whale and unusual activity", "Big orders, pumps and dumps radar", "#/activity", "elite"],
    ["🥇", "Gold deep analysis", "7-day free trial", "#/gold", "elite"],
    ["₿", "BTC deep analysis", "7-day free trial", "#/btc", "elite"],
  ]],
  ["Analysis", [
    ["🤖", "AI chart analyzer", "Analyze any pair or upload a chart", "#/ai"],
    ["📐", "Fibonacci and levels", "Fibonacci, pivots and support and resistance", "#/fib"],
    ["💪", "Currency strength", "Strength and forex market hours", "#/strength"],
    ["⏰", "Crypto peak hours", "High, medium and low volume hours", "#/hours"],
    ["📊", "Funding and open interest", "Crypto futures positioning", "#/funding", "premium"],
  ]],
  ["Trade planning", [
    ["🧮", "Risk calculator pro", "Position size, lots, margin, liquidation", "#/risk"],
    ["📔", "Trading journal", "Track trades and find your edge", "#/journal"],
    ["💼", "Portfolio tracker", "Live value and profit or loss", "#/portfolio"],
    ["🔔", "Alerts", "Price, RSI, breakout and trend alerts", "#/alerts"],
  ]],
  ["News and learning", [
    ["📅", "Economic calendar", "Events with impact analysis", "#/calendar"],
    ["📰", "Market news", "Forex, gold and crypto headlines", "#/news"],
    ["🎓", "Trading academy", "Forex, crypto, gold and SMC course", "#/academy"],
    ["📖", "Trader stories", "Real journeys of famous traders", "#/stories", "premium"],
    ["🏦", "Best exchange and brokers", "Bonuses and free Premium or Elite", "#/exchanges"],
    ["💱", "Currency converter", "160+ currencies, crypto and gold", "#/converter"],
  ]],
];

export default async function tools(ctx) {
  ctx.top({ title: "Tools", sub: "Your trading toolkit" });
  const p = plan();
  const hero = p === "elite" ? "" : html`<a class="banner upgrade pro-strip" href="#/upgrade?plan=${p === "free" ? "premium" : "elite"}"><span class="emo">🔓</span><span><b>${p === "free" ? "Unlock every Pro tool" : "Go Elite for the full toolkit"}</b><span class="muted">${p === "free" ? "Premium removes full-screen ads and opens every market, timeframe and the full academy." : "Best Trades, whale radar, gold and BTC deep analysis."}</span></span><span class="btn btn-gold btn-sm">Upgrade</span></a>`;
  ctx.render(html`${hero}${GROUPS.map(([g, items]) => html`<section class="panel"><div class="panel-head"><h2>${g}</h2></div><div class="list">
    ${items.map(([emo, name, desc, href, tier]) => {
      const locked = (tier === "elite" && p !== "elite") || (tier === "premium" && p === "free");
      return html`<a class="li${locked ? " is-locked" : ""}" href="${href}"><span class="with-ic"><span class="lead-ic">${emo}${locked ? html`<i class="mini-lock">${icon.lock}</i>` : ""}</span><span><span class="t">${name}</span><span class="s">${desc}</span></span></span>
      <span class="r">${tier === "elite" ? html`<span class="tag ${locked ? "gold" : "bull"}">${locked ? "🔒 Elite" : "👑 Elite"}</span>` : tier === "premium" ? html`<span class="tag ${locked ? "sky" : "bull"}">${locked ? "🔒 Premium" : "⭐ Premium"}</span>` : html`<span class="tag free">Free</span>`}</span></a>`;
    })}
  </div></section>`)}
  <a class="banner channel" href="https://t.me/AliceCryptoPro_Official" target="_blank" rel="noopener"><span class="emo">📣</span><span><b>Daily analysis on Telegram</b><span>Join the official Alice channel: gold, BTC and forex outlook every day.</span></span><span class="btn btn-sm btn-tg">Join</span></a>
  <section class="panel"><div class="panel-head"><h2>Free calculators on the website</h2></div><p class="note mt0">Pip value, pivot points, margin, liquidation, compounding and more, no account needed.</p>
    <a class="btn btn-line btn-sm" href="${A.base}tools/">Open the free tools</a></section>`);
}
