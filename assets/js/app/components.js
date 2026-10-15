/* Pieces shared by several screens. */
import { html, raw, esc, icon, price, pct, upDown, scoreHtml, labelTag, untilText, toMs, api, session, num } from "./core.js";

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
export function sponsoredBreak(seconds = 6, title = "Your reward is almost ready") {
  return new Promise((resolve) => {
    const A = window.ALICE || {};
    const code = (A.slots && A.slots.spin) || "";
    const root = document.getElementById("sheet-root");
    const bg = document.createElement("div");
    bg.className = "sheet-bg";
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Sponsored"><h2>${esc(title)}</h2>
      <div class="ad-wait" id="sb-slot">${code ? "" : '<b style="color:var(--text)">Go ad-free with Premium</b><p style="margin:6px 0 0">Premium members never see ads and get every market and timeframe.</p>'}</div>
      <p class="note center" style="margin:12px 0 0" id="sb-count">Please wait ${seconds} seconds</p>
      <button class="btn btn-gold btn-block" style="margin-top:12px" id="sb-go" disabled>Continue</button></div>`;
    root.appendChild(bg);
    if (code) {
      const slot = bg.querySelector("#sb-slot"); slot.innerHTML = code;
      slot.querySelectorAll("script").forEach((old) => { const s = document.createElement("script"); for (const a of old.attributes) s.setAttribute(a.name, a.value); s.text = old.text; old.replaceWith(s); });
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
