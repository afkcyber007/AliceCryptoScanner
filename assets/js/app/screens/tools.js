/* Tools hub, the same toolkit as the Android app. */
import { A, html, plan } from "../core.js";

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
  ctx.render(html`${GROUPS.map(([g, items]) => html`<section class="panel"><div class="panel-head"><h2>${g}</h2></div><div class="list">
    ${items.map(([emo, name, desc, href, tier]) => html`<a class="li" href="${href}"><span class="with-ic"><span class="lead-ic">${emo}</span><span><span class="t">${name}</span><span class="s">${desc}</span></span></span>
      <span class="r">${tier === "elite" && p !== "elite" ? html`<span class="tag gold">Elite</span>` : tier === "premium" && p === "free" ? html`<span class="tag sky">Premium</span>` : ""}</span></a>`)}
  </div></section>`)}
  <section class="panel"><div class="panel-head"><h2>Free calculators on the website</h2></div><p class="note mt0">Pip value, pivot points, margin, liquidation, compounding and more, no account needed.</p>
    <a class="btn btn-line btn-sm" href="${A.base}tools/">Open the free tools</a></section>`);
}
