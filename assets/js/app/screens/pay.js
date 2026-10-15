/* Plans and crypto payment (USDT TRC20/BEP20 or BTC). The admin team verifies each payment in Telegram. */
import { A, html, raw, api, session, plan, go, qs, num, skeleton, errorBox, toast, copy, icon, loadConfig, toMs, featList } from "../core.js";
import { offerBox, tickOffers } from "../components.js";

function offerPrice(cfg, pid, period) {
  const o = cfg.offer;
  if (!o || !o.active || (o.ends_at && toMs(o.ends_at) < Date.now())) return null;
  const p = (o.prices || {})[pid];
  return p && p[period] != null ? p[period] : null;
}

export async function upgrade(ctx) {
  ctx.top({ title: "Upgrade", sub: "Premium and Elite" });
  const cfg = (await loadConfig()) || {};
  const plans = cfg.plans && cfg.plans.length ? cfg.plans : [
    { id: "premium", label: "Premium", monthly: 19.99, yearly: 149.99, features: [] }, { id: "elite", label: "Elite", monthly: 39.99, yearly: 299.99, features: [] }];
  const cur = plan();
  let pid = ctx.query.plan === "premium" || ctx.query.plan === "elite" ? ctx.query.plan : cur === "premium" ? "elite" : "elite";
  let period = ctx.query.period === "monthly" ? "monthly" : "yearly";
  const draw = () => {
    const p = plans.find((x) => x.id === pid) || plans[0];
    const price = (per) => { const o = offerPrice(cfg, p.id, per); return o != null ? o : p[per]; };
    const save = Math.round(100 - price("yearly") / (price("monthly") * 12) * 100);
    ctx.render(html`
      <section class="center" style="padding:6px 0 4px"><h2 style="font-size:clamp(22px,4vw,30px);margin:0 0 6px">Unlock the full Alice toolkit</h2><p class="muted" style="margin:0">Best Trades, every market and timeframe, AI tools and no ads. One plan works on the website, Android and iPhone.</p></section>
      ${offerBox(cfg.offer)}
      <div class="plan-cards" role="group" aria-label="Plan">${plans.map((x) => html`<button type="button" data-plan="${x.id}" aria-pressed="${x.id === pid}"><b>${x.label}</b>${x.id === "elite" ? html` <span class="tag gold">Most complete</span>` : ""}<div class="note">From $${num(offerPrice(cfg, x.id, "yearly") ?? x.yearly)} a year</div></button>`)}</div>
      <div class="period-pick" role="group" aria-label="Billing period">
        <button type="button" data-period="monthly" aria-pressed="${period === "monthly"}"><small>Monthly</small><b>$${num(price("monthly"))}</b>${offerPrice(cfg, p.id, "monthly") != null ? html`<small><s>$${num(p.monthly)}</s></small>` : html`<small>per month</small>`}</button>
        <button type="button" data-period="yearly" aria-pressed="${period === "yearly"}"><small>Yearly</small><b>$${num(price("yearly"))}</b><small class="save">${save > 0 ? "Save " + save + "%" : ""}</small>${offerPrice(cfg, p.id, "yearly") != null ? html` <small><s>$${num(p.yearly)}</s></small>` : ""}</button>
      </div>
      <section class="panel"><div class="panel-head"><h2>${p.label} includes</h2></div>${featList((p.features || []).map((f) => f.replace(/^[^\w(]+/, "")))}</section>
      ${cur === "elite" ? html`<div class="panel center"><b>You're on Elite</b><p class="note" style="margin:4px 0 0">Buying again extends your plan.</p></div>` : ""}
      <a class="btn btn-gold btn-block" href="${session.loggedIn ? "#/pay/" + pid + "/" + period : "#/signup?next=" + encodeURIComponent("/pay/" + pid + "/" + period)}">Pay $${num(price(period))} with crypto</a>
      <p class="note center" style="margin:8px 0 0">USDT (TRC20 or BEP20) or Bitcoin. Activated by our team after checking the payment, usually within a few hours.</p>
      <div class="grid-2">
        <a class="banner upgrade" href="#/rewards"><span class="emo">🪙</span><span><b>Or earn it with coins</b><span class="muted">Spin daily and invite friends. 5,000 coins = 1 month Premium.</span></span>${icon.chev}</a>
        <a class="banner upgrade" href="#/exchanges"><span class="emo">🎁</span><span><b>Free with a partner exchange</b><span class="muted">Trade on one of our partner exchanges and get Premium or Elite free.</span></span>${icon.chev}</a>
      </div>
      <p class="note center">On Android you can also pay with Google Play inside the app. ${session.loggedIn ? html`<a href="#/payments">My payments</a>` : ""}</p>`);
    tickOffers(ctx.view);
  };
  ctx.on("[data-plan]", "click", (e, b) => { pid = b.dataset.plan; draw(); });
  ctx.on("[data-period]", "click", (e, b) => { period = b.dataset.period; draw(); });
  draw();
  ctx.every(1000, () => tickOffers(ctx.view));
}

let qrLib = null;
function loadQr() {
  if (qrLib) return qrLib;
  qrLib = new Promise((resolve) => {
    if (window.qrcode) return resolve(window.qrcode);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.onload = () => resolve(window.qrcode || null); s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return qrLib;
}

export async function pay(ctx) {
  const pid = ctx.params.plan, period = ctx.params.period;
  const name = pid === "elite" ? "Elite" : "Premium";
  ctx.top({ title: "Pay with crypto", sub: name + ", " + period });
  if (!["premium", "elite"].includes(pid) || !["monthly", "yearly"].includes(period)) { go("/upgrade"); return; }
  const cfg = (await loadConfig()) || {};
  const methods = cfg.payment_methods || [];
  let method = methods.find((m) => m.id === "usdt_trc20") ? "usdt_trc20" : (methods[0] || {}).id, q = null, qErr = null, file = null, preview = "", sending = false, done = null;
  const draw = () => {
    if (done) {
      ctx.render(html`<section class="panel center" style="padding:28px 18px"><div style="font-size:44px">✅</div><h2 style="font-size:22px;margin:8px 0 6px">Payment submitted</h2>
        <p class="muted" style="max-width:30rem;margin:0 auto 16px">${done.message || "Our team will verify it and activate your plan, usually within a few hours."}</p>
        <div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="#/payments">My payments</a><a class="btn btn-line" href="${(cfg.contact && cfg.contact.telegram_url) || A.tg}" target="_blank" rel="noopener">Message support</a></div></section>`);
      return;
    }
    ctx.render(html`
      <div class="tabs" role="group" aria-label="Payment method">${methods.map((m) => html`<button type="button" data-method="${m.id}" aria-pressed="${m.id === method}">${m.label}</button>`)}</div>
      ${qErr ? errorBox(qErr) : !q ? skeleton(3, 60) : html`
      <section class="panel">
        <div class="panel-head"><h2>1. Send exactly</h2></div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="font:700 30px/1.1 var(--display);color:var(--gold);font-variant-numeric:tabular-nums">${q.amount} ${q.asset}</span><button class="btn btn-line btn-sm" data-copy="${q.amount}">${icon.copy} Copy amount</button></div>
        <p class="note" style="margin:6px 0 0">${name} ${period}, $${num(q.usd)}${q.btc_price ? ", at BTC $" + num(q.btc_price, 0) : ""}</p>
        <div class="panel-head" style="margin-top:18px"><h2>2. To this ${q.network} address</h2></div>
        <div class="copy-box"><span>${q.address}</span><button class="btn btn-line btn-sm" data-copy="${q.address}">${icon.copy} Copy</button></div>
        <div class="qr" id="qr" aria-label="QR code of the address"></div>
        <p class="err" style="margin:8px 0 0">⚠️ ${q.warning}</p>
      </section>
      <form class="panel form" id="payf" novalidate>
        <div class="panel-head" style="margin:0"><h2>3. Confirm your payment</h2></div>
        <label class="upload">${preview ? html`<img src="${preview}" alt="Payment screenshot">` : html`<span style="font-size:28px">📷</span><b style="color:var(--text)">Add the payment screenshot</b><span>From your wallet or exchange, showing the amount and transaction</span>`}<input type="file" accept="image/png,image/jpeg,image/webp" id="shot"></label>
        <div class="field"><label for="txid">Transaction ID (TxID or hash)</label><input id="txid" autocomplete="off" spellcheck="false" placeholder="${q.network === "BEP20" ? "0x…" : "64 letters and numbers"}"></div>
        <p class="err" id="perr" hidden></p>
        <button class="btn btn-gold" type="submit" ${sending ? raw("disabled") : ""}>${sending ? "Submitting…" : "Submit payment"}</button>
        <p class="note" style="margin:0">Your screenshot and TxID go only to the Alice admin team for verification.</p>
      </form>`}`);
    if (q) loadQr().then((qr) => {
      const el = ctx.view.querySelector("#qr"); if (!el) return;
      if (!qr) { el.remove(); return; }
      const c = qr(0, "M"); c.addData(q.address); c.make(); el.innerHTML = c.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    });
  };
  const loadQuote = async () => {
    q = null; qErr = null; draw();
    try { q = await api("/api/payments/quote" + qs({ plan: pid, period, method })); } catch (e) { qErr = e; }
    if (ctx.alive) draw();
  };
  ctx.on("[data-method]", "click", (e, b) => { method = b.dataset.method; loadQuote(); });
  ctx.on("[data-copy]", "click", (e, b) => copy(b.dataset.copy));
  ctx.on("#shot", "change", (e) => {
    file = e.target.files && e.target.files[0];
    if (file && file.size > 8 * 1024 * 1024) { toast("The screenshot must be under 8 MB"); file = null; }
    if (preview) URL.revokeObjectURL(preview); preview = file ? URL.createObjectURL(file) : "";
    const tx = ctx.view.querySelector("#txid").value; draw(); ctx.view.querySelector("#txid").value = tx;
  });
  ctx.on("#payf", "submit", async (e) => {
    e.preventDefault();
    const err = ctx.view.querySelector("#perr"), txid = ctx.view.querySelector("#txid").value.trim();
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    if (!file) return fail("Please add the payment screenshot.");
    if (q.txid_pattern && !new RegExp(q.txid_pattern).test(txid)) return fail(q.network === "BEP20" ? "That TxID doesn't look right. It should start with 0x followed by 64 characters." : "That TxID doesn't look right. It should be 64 letters and numbers.");
    sending = true; const btn = ctx.view.querySelector("#payf button[type=submit]"); btn.disabled = true; btn.textContent = "Submitting…";
    const fd = new FormData(); fd.append("plan", pid); fd.append("period", period); fd.append("method", method); fd.append("txid", txid); fd.append("screenshot", file);
    try { done = await api("/api/payments", { method: "POST", form: fd, timeout: 60000 }); draw(); }
    catch (ex) { sending = false; btn.disabled = false; btn.textContent = "Submit payment"; fail(ex.message); }
  });
  ctx.cleanup(() => { if (preview) URL.revokeObjectURL(preview); });
  await loadQuote();
}
