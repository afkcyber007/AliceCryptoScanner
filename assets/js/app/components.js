/* Pieces shared by several screens. */
import { html, raw, esc, icon, price, pct, upDown, scoreHtml, labelTag, untilText, toMs, api, session, num, mountAd } from "./core.js";

export const MARKETS = [["crypto", "Crypto"], ["forex", "Forex"], ["commodities", "Gold and oil"], ["indices", "Indices"], ["stocks", "US stocks"]];
export const marketName = (m) => (MARKETS.find((x) => x[0] === m) || [m, m])[1];
export const detailHref = (market, symbol, tf) => `#/m/${encodeURIComponent(market)}/${encodeURIComponent(symbol)}${tf ? "?tf=" + tf : ""}`;

export function setupRow(it, tf) {
  return html`<a class="li score-row" href="${detailHref(it.market, it.symbol, tf || it.tf)}">
    <span><span class="t">${it.display || it.symbol}</span><span class="s">${price(it.price, it.market, it.symbol)} <span class="${upDown(it.change24h)}">${pct(it.change24h)}</span>${it.label ? " · " + it.label : ""}</span></span>
    ${scoreHtml(it.score)}</a>`;
}
export function quoteCard(q) {
  return html`<a class="qcard" href="${detailHref(q.market, q.symbol)}"><small>${q.display || q.symbol}</small><b>${price(q.price, q.market, q.symbol)}</b><span class="${upDown(q.change24h)}">${pct(q.change24h)}</span></a>`;
}

/** Discount offer started from the Telegram bot (/offer). */
export function offerBox(o) {
  if (!o || !o.active || (o.ends_at && toMs(o.ends_at) < Date.now())) return "";
  const rows = [];
  for (const [pid, p] of Object.entries(o.prices || {})) {
    const name = pid === "elite" ? "Elite" : "Premium";
    if (p.monthly != null) rows.push(html`<span class="pc">${name} monthly <s>$${num(p.monthly_was)}</s><b>$${num(p.monthly)}</b></span>`);
    if (p.yearly != null) rows.push(html`<span class="pc">${name} yearly <s>$${num(p.yearly_was)}</s><b>$${num(p.yearly)}</b></span>`);
  }
  return html`<section class="offer" aria-label="Limited offer">
    <div class="offer-top"><span class="lim">Limited offer</span><span class="pct">-${o.percent}%</span></div>
    <h3>${o.title || o.percent + "% off " + (o.plan === "all" ? "Premium and Elite" : o.plan === "elite" ? "Elite" : "Premium")}</h3>
    ${o.text ? html`<p>${o.text}</p>` : ""}
    ${rows.length ? html`<div class="prices">${rows}</div>` : ""}
    <div class="offer-foot"><span class="ends" data-ends="${toMs(o.ends_at) || ""}">${o.ends_at ? "Ends in " + untilText(o.ends_at) : ""}</span>
      <a class="btn btn-sm" href="${o.support_url || "https://t.me/AliceSupportTeam"}" target="_blank" rel="noopener">${o.button || "Claim now"}</a></div>
  </section>`;
}
export function tickOffers(root) {
  root.querySelectorAll("[data-ends]").forEach((el) => { const t = +el.dataset.ends; if (t) el.textContent = t > Date.now() ? "Ends in " + untilText(t) : "Ended"; });
}

/** Paid promotion started from the Telegram bot (/promo). Always labelled as sponsored. */
const promoSeen = new Set();
export function promoBox(p) {
  if (!p || (p.ends_at && toMs(p.ends_at) < Date.now())) return "";
  if (!promoSeen.has(p.id)) { promoSeen.add(p.id); api("/api/promo/event", { method: "POST", body: { id: p.id, kind: "view" }, auth: false }).catch(() => {}); }
  return html`<section class="sponsored"><small>${p.label || "Sponsored · Paid promotion"}</small><h3>${p.title}</h3>${p.text ? html`<p>${p.text}</p>` : ""}
    <a class="btn btn-line btn-sm" href="${p.url}" target="_blank" rel="noopener sponsored" data-promo="${p.id}">${p.button || "Visit"} ${icon.ext}</a></section>`;
}
export function wirePromo(root) {
  root.querySelectorAll("[data-promo]").forEach((a) => a.addEventListener("click", () => {
    api("/api/promo/event", { method: "POST", body: { id: a.dataset.promo, kind: "click" }, auth: false }).catch(() => {});
  }));
}

/** Simple bar list for 0-100 parts. */
export function partsBars(parts, labels) {
  return html`<div class="bars">${Object.entries(parts).filter(([, v]) => v != null).map(([k, v]) => {
    const c = v >= 65 ? "var(--bull)" : v <= 35 ? "var(--bear)" : "var(--gold)";
    return html`<div class="bar"><span>${(labels && labels[k]) || k}</span><span class="meter"><i style="width:${Math.max(3, Math.min(100, v))}%;background:${c}"></i></span><b>${Math.round(v)}</b></div>`;
  })}</div>`;
}

/** Markdown-ish text from the server (lessons, stories, AI answers) → safe HTML. */
export function md(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  let out = "", list = null;
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  const close = () => { if (list) { out += `</${list}>`; list = null; } };
  let table = null;
  const flushTable = () => {
    if (!table) return;
    const rows = table.filter((r) => !/^\|?\s*:?-{2,}/.test(r)).map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
    out += '<div style="overflow-x:auto"><table class="table"><thead><tr>' + rows[0].map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>" +
      rows.slice(1).map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>";
    table = null;
  };
  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith("|")) { close(); (table = table || []).push(t); continue; }
    flushTable();
    if (!t) { close(); continue; }
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { close(); out += `<h3>${inline(m[2])}</h3>`; continue; }
    if ((m = t.match(/^[-*•]\s+(.*)$/))) { if (list !== "ul") { close(); out += "<ul>"; list = "ul"; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { if (list !== "ol") { close(); out += "<ol>"; list = "ol"; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = t.match(/^!\[(.*?)\]\((.+?)\)$/))) { close(); out += `<img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">`; continue; }
    if (/^---+$/.test(t)) { close(); out += "<hr>"; continue; }
    close(); out += `<p>${inline(t)}</p>`;
  }
  flushTable(); close();
  return raw(out);
}

export const planName = (p) => (p === "elite" ? "Elite" : p === "premium" ? "Premium" : "Free");
export const isElite = () => session.user && session.user.plan === "elite";

/** Short sponsored break used where the Android app shows a rewarded video (spins, bonus analyses).
 *  Shows the "slot-spin" ad code from the website's ads folder (or a house message) for `seconds`. */
export function sponsoredBreak(seconds = 6, title = "Your reward is almost ready", paid = false) {
  return new Promise((resolve) => {
    const A = window.ALICE || {};
    const code = (A.slots && A.slots.spin) || "";
    const root = document.getElementById("sheet-root");
    const bg = document.createElement("div");
    bg.className = "sheet-bg";
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Sponsored"><h2>${esc(title)}</h2>
      <div class="ad-wait" id="sb-slot">${code ? "" : paid
        ? `<b style="color:var(--text)">Free daily analysis on Telegram</b><p style="margin:6px 0 10px">Gold, Bitcoin and forex outlook every day.</p>${A.join ? `<a class="btn btn-line btn-sm" href="${A.join}" target="_blank" rel="noopener">Join our Telegram Channel</a>` : ""}`
        : '<b style="color:var(--text)">Go ad-free with Premium</b><p style="margin:6px 0 0">Premium members never see full-screen ads and get every market and timeframe.</p>'}</div>
      <p class="note center" style="margin:12px 0 0" id="sb-count">Please wait ${seconds} seconds</p>
      <button class="btn btn-gold btn-block" style="margin-top:12px" id="sb-go" disabled>Continue</button></div>`;
    root.appendChild(bg);
    if (code) {
      mountAd(bg.querySelector("#sb-slot"), code);
    }
    let left = seconds;
    const btn = bg.querySelector("#sb-go"), cnt = bg.querySelector("#sb-count");
    const t = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(t); cnt.textContent = "Thanks for waiting"; btn.disabled = false; btn.focus(); }
      else cnt.textContent = "Please wait " + left + " second" + (left === 1 ? "" : "s");
    }, 1000);
    btn.addEventListener("click", () => { bg.remove(); resolve(true); });
  });
}

/* ------------------------------------------------------------------ market mood meter (needle gauge) */
/** Semicircle gauge: 0 = strong bearish (left), 100 = strong bullish (right). */
export function gauge(value, { size = 220, label = "", sub = "" } = {}) {
  const v = Math.max(0, Math.min(100, Number(value) || 50));
  const ang = -90 + v * 1.8;
  const seg = (a0, a1, c) => {
    const r = 80, cx = 100, cy = 100, p = (a) => [cx + r * Math.cos((a - 180) * Math.PI / 180), cy + r * Math.sin((a - 180) * Math.PI / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A80 80 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="16" fill="none"/>`;
  };
  const cls = v >= 55 ? "up" : v <= 45 ? "down" : "";
  return raw(`<div class="gauge" style="width:${size}px">
    <svg viewBox="0 0 200 118" role="img" aria-label="${label || "Market mood"}: ${Math.round(v)} of 100">
      ${seg(0, 35, "#EA3943")}${seg(36, 71, "#F0766E")}${seg(72, 107, "#8A94A8")}${seg(108, 143, "#5BD49A")}${seg(144, 180, "#16C784")}
      <g class="gauge-needle" style="transform:rotate(${ang}deg)"><path d="M97 100 L100 26 L103 100 Z" fill="currentColor"/></g>
      <circle cx="100" cy="100" r="9" fill="currentColor"/><circle cx="100" cy="100" r="4" fill="var(--bg)"/>
      <text x="16" y="116" font-size="10" fill="#EA3943">Bearish</text><text x="184" y="116" font-size="10" fill="#16C784" text-anchor="end">Bullish</text>
    </svg>
    <div class="gauge-v ${cls}">${Math.round(v)}</div>${label ? `<div class="gauge-l">${label}</div>` : ""}${sub ? `<div class="gauge-s">${sub}</div>` : ""}</div>`);
}

/** Market mood meter panel (overall needle + one needle per market + strongest bullish / bearish lists). */
export function meterPanel(m, group = "crypto") {
  if (!m || !m.groups || !Object.keys(m.groups).length) return "";
  const g = m.groups[group] || m.groups[Object.keys(m.groups)[0]];
  const row = (a) => `<a class="li" href="${detailHref(a.market, a.symbol, "1h")}"><span><span class="t">${esc(a.display)}</span><span class="s">${esc(a.label)}</span></span><span class="r"><span class="mini-meter"><i style="left:${a.score}%"></i></span><b class="${a.score >= 55 ? "up" : a.score <= 45 ? "down" : ""}">${a.score}</b></span></a>`;
  return raw(`<section class="panel meter-panel">
    <div class="panel-head"><h2>🧭 Market mood meter</h2><span class="note">1H scanner · live</span></div>
    <div class="meter-top">${gauge(m.overall.value, { size: 230, label: "All markets · " + m.overall.label })}
      <div class="meter-mini">${Object.entries(m.groups).map(([k, x]) => `<button type="button" data-meter="${k}" aria-pressed="${k === group}" class="mm">${gauge(x.value, { size: 110, label: x.name })}</button>`).join("")}</div></div>
    <div class="grid-2 meter-lists">
      <div><h3 class="up">📈 Strongest bullish · ${g.name}</h3><div class="list">${g.strong_bullish.length ? g.strong_bullish.map(row).join("") : '<p class="note">No strong bullish market right now.</p>'}</div></div>
      <div><h3 class="down">📉 Strongest bearish · ${g.name}</h3><div class="list">${g.strong_bearish.length ? g.strong_bearish.map(row).join("") : '<p class="note">No strong bearish market right now.</p>'}</div></div>
    </div>
    <p class="note" style="margin:8px 0 0">${g.bullish} bullish · ${g.bearish} bearish of ${g.total} ${g.name.toLowerCase()} markets on the 1-hour chart.</p></section>`);
}
