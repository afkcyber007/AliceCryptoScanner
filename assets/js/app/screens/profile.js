/* Profile, account settings, payments history, install and support. */
import { A, API, html, raw, api, session, plan, refreshMe, int, date, toMs, go, skeleton, errorBox, toast, confirmSheet, icon, shareText, loadConfig, dropCache } from "../core.js";
import { planName } from "../components.js";
import { LANGS, lang, setLang } from "../i18n.js";
import * as push from "../push.js";

const row = (href, ic, label, extra = "", attrs = "") => html`<a class="li" href="${href}" ${raw(attrs)}><span class="with-ic"><span class="lead-ic">${ic}</span><span class="t">${label}</span></span><span class="r" style="display:flex;align-items:center;gap:6px">${extra}${icon.chev}</span></a>`;

export async function profile(ctx) {
  ctx.top({ title: "Profile" });
  const u = session.user, p = plan(), cfg = session.config || {}, contact = cfg.contact || {};
  const tg = contact.telegram_url || A.tg || "https://t.me/AliceSupportTeam";
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  ctx.render(html`
    ${u ? html`<section class="panel" style="display:flex;gap:14px;align-items:center">
        <span style="width:56px;height:56px;border-radius:16px;background:var(--s3);display:grid;place-items:center;font:700 22px var(--display);color:var(--gold);flex:none">${(u.name || u.email || "?").trim()[0].toUpperCase()}</span>
        <span style="min-width:0;flex:1"><b style="display:block;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.name}</b><span class="note" style="display:block;overflow:hidden;text-overflow:ellipsis">${u.email}</span></span>
        <span class="plan-badge ${p}">${planName(p)}</span></section>
      <section class="panel"><div class="kv">
        <div><small>Plan</small><b>${planName(p)}${u.plan_period ? ", " + u.plan_period : ""}</b></div>
        <div><small>${p === "free" ? "Member since" : "Active until"}</small><b>${p === "free" ? date(u.created_at) : date(u.plan_expires_at)}</b></div>
        <div><small>Coins</small><b style="color:var(--gold)">${int(u.coins || 0)}</b></div>
      </div>${p !== "elite" ? html`<a class="btn btn-gold btn-block" style="margin-top:12px" href="#/upgrade${p === "premium" ? "?plan=elite" : ""}">${p === "free" ? "Upgrade to Premium or Elite" : "Upgrade to Elite"}</a>` : ""}
      ${p !== "free" && toMs(u.plan_expires_at) - Date.now() < 7 * 864e5 ? html`<p class="warn small" style="margin:10px 0 0">Your plan ends in ${Math.max(0, Math.ceil((toMs(u.plan_expires_at) - Date.now()) / 864e5))} days. <a href="#/upgrade?plan=${p}">Renew now</a></p>` : ""}</section>`
    : html`<section class="panel center"><h2 style="font-size:20px;margin:0 0 6px">You're using Alice as a guest</h2><p class="note">Create a free account to save alerts, join the rooms, collect coins and use the same account on Android and iPhone.</p>
        <div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="#/signup">Create a free account</a><a class="btn btn-line" href="#/login">Log in</a></div></section>`}
    ${u ? html`<section class="panel"><div class="panel-head"><h2>Account</h2></div><div class="list">
      ${row("#/edit-profile", "👤", "Edit profile")}
      ${row("#/rewards", "🪙", "Rewards and referral", html`<span class="note" style="margin-right:6px">${int(u.coins || 0)}</span>`)}
      ${row("#/payments", "🧾", "My payments")}
      ${row("#/alerts", "🔔", "Alerts")}
      ${row("#/password", "🔑", "Change password")}
    </div></section>` : ""}
    <section class="panel"><div class="panel-head"><h2>Settings</h2></div><div class="list">
      ${row("#/notifications", "🔔", "Notifications", html`<span class="tag ${push.enabled() ? "bull" : ""}" style="margin-right:6px">${push.enabled() ? "On" : "Off"}</span>`)}
      ${row("#/language", "🌐", "Language", html`<span class="note" style="margin-right:6px">${(LANGS.find((l) => l[0] === lang) || LANGS[0])[1]}</span>`)}
    </div></section>
    <section class="panel"><div class="panel-head"><h2>Get the app</h2></div><div class="list">
      ${row("#/install", isIos ? "🍏" : "📲", isIos ? "Install on iPhone" : "Install Alice", html`<span class="note" style="margin-right:6px">${isIos ? "Home Screen" : "Android, iPhone, PC"}</span>`)}
    </div></section>
    <section class="panel"><div class="panel-head"><h2>Help and community</h2></div><div class="list">
      ${row(tg, "💬", "Telegram support", "", 'target="_blank" rel="noopener"')}
      ${row(A.channel || "https://t.me/AliceCryptoPro_Official", "📣", "Daily analysis channel", html`<span class="tag gold" style="margin-right:6px">Telegram</span>`, 'target="_blank" rel="noopener"')}
      ${row("#/contact", "✉️", "Contact")}
      <button type="button" class="li" data-share><span class="with-ic"><span class="lead-ic">🤝</span><span class="t">Share Alice with a friend</span></span><span class="r">${icon.chev}</span></button>
      ${row(A.base, "🌐", "Alice Forex/Crypto Scanner website")}
    </div></section>
    <section class="panel"><div class="panel-head"><h2>Legal and privacy</h2></div><div class="list">
      ${row(A.base + "disclaimer/", "⚠️", "Risk disclaimer")}${row(A.base + "terms/", "📄", "Terms of use")}${row(A.base + "privacy/", "🔒", "Privacy policy")}
    </div></section>
    ${u ? html`<div class="btn-row" style="justify-content:center"><button class="btn btn-line" data-logout>${icon.logout} Log out</button></div>
      <p class="center"><a href="#/delete" style="color:var(--bear)">Delete account</a></p>` : ""}
    <p class="note center">Alice web app, version ${A.v || "dev"}</p>`);
  ctx.on("[data-logout]", "click", async () => {
    if (!(await confirmSheet("Log out?", "You can log in again any time with your email and password.", "Log out"))) return;
    session.clear(); dropCache(); push.resync(); toast("Logged out"); go("/home");
  });
  ctx.on("[data-share]", "click", () => {
    const share = cfg.share || {};
    const link = (A.site || location.origin) + (A.base || "/");
    shareText("📈 Alice Forex/Crypto Scanner: live scanner, Best Trades, gold and BTC analysis and pro trading tools. Free on the web, Android and iPhone.", link);
  });
  if (u) refreshMe().then((nu) => { if (nu && ctx.alive && (nu.plan !== u.plan || nu.coins !== u.coins)) profile(ctx); });
}

export async function edit(ctx) {
  ctx.top({ title: "Edit profile" });
  const u = session.user || {};
  const EX = ["", "Bitunix", "Binance", "Bybit", "OKX", "Bitget", "MEXC", "KuCoin", "Gate.io", "HTX", "BingX", "Coinbase", "Kraken", "Other"];
  ctx.render(html`<form class="panel form" id="pf" style="max-width:560px">
    <div class="field"><label for="name">Full name</label><input id="name" value="${u.name || ""}" maxlength="40" required></div>
    <div class="field"><label for="country">Country</label><input id="country" value="${u.country || ""}" maxlength="60"></div>
    <div class="field"><label for="dob">Date of birth</label><input id="dob" type="date" value="${u.dob || ""}"><small>Used to reset your password</small></div>
    <div class="field"><label for="focus">Markets you trade</label><select id="focus">${[["both", "Crypto and forex"], ["crypto", "Crypto"], ["forex", "Forex and gold"]].map(([v, n]) => html`<option value="${v}" ${u.market_focus === v ? raw("selected") : ""}>${n}</option>`)}</select></div>
    <div class="field"><label for="ex">Exchange</label><select id="ex">${EX.map((x) => html`<option value="${x}" ${x === (u.exchange || "") ? raw("selected") : ""}>${x || "None"}</option>`)}</select></div>
    <div class="field"><label for="uid">Exchange UID</label><input id="uid" value="${u.exchange_uid || ""}" maxlength="40"></div>
    <p class="err" id="err" hidden></p>
    <button class="btn btn-gold" type="submit">Save changes</button></form>`);
  ctx.on("#pf", "submit", async (e) => {
    e.preventDefault();
    const g = (id) => ctx.view.querySelector("#" + id).value.trim(), err = ctx.view.querySelector("#err");
    const body = { name: g("name"), country: g("country"), market_focus: g("focus"), exchange: g("ex"), exchange_uid: g("uid") };
    if (g("dob")) body.dob = g("dob");
    try { const r = await api("/api/me", { method: "PATCH", body }); session.setUser(r.user); toast("Profile saved"); go("/profile"); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
}

export async function password(ctx) {
  ctx.top({ title: "Change password" });
  ctx.render(html`<form class="panel form" id="pw" style="max-width:480px">
    <div class="field"><label for="cur">Current password</label><input id="cur" type="password" autocomplete="current-password" required></div>
    <div class="field"><label for="new">New password (at least 8 characters)</label><input id="new" type="password" autocomplete="new-password" minlength="8" required></div>
    <div class="field"><label for="new2">Confirm new password</label><input id="new2" type="password" autocomplete="new-password" required></div>
    <p class="err" id="err" hidden></p><button class="btn btn-gold" type="submit">Change password</button>
    <p class="note" style="margin:0">You'll stay logged in here. Other devices will need to log in again.</p></form>`);
  ctx.on("#pw", "submit", async (e) => {
    e.preventDefault();
    const g = (id) => ctx.view.querySelector("#" + id).value, err = ctx.view.querySelector("#err");
    if (g("new").length < 8) { err.textContent = "The new password must be at least 8 characters."; err.hidden = false; return; }
    if (g("new") !== g("new2")) { err.textContent = "The new passwords don't match."; err.hidden = false; return; }
    try { const r = await api("/api/me/password", { method: "POST", body: { current_password: g("cur"), new_password: g("new") } }); session.set(r.token, r.user); toast("Password changed"); go("/profile"); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
}

export async function del(ctx) {
  ctx.top({ title: "Delete account" });
  ctx.render(html`<form class="panel form" id="df" style="max-width:520px;border-color:rgba(234,57,67,.5)">
    <h2 style="font-size:20px;margin:0">Delete your Alice account</h2>
    <p class="mt0" style="margin:0">This permanently deletes your account, plan, coins, alerts and messages on the website and in the app. It can't be undone. An active plan is not refunded.</p>
    <div class="field"><label for="pw">Enter your password to confirm</label><input id="pw" type="password" autocomplete="current-password" required></div>
    <p class="err" id="err" hidden></p>
    <button class="btn btn-line" type="submit" style="color:var(--bear);border-color:var(--bear)">Delete my account</button></form>`);
  ctx.on("#df", "submit", async (e) => {
    e.preventDefault();
    const err = ctx.view.querySelector("#err");
    if (!(await confirmSheet("Delete your account forever?", "Everything will be removed. This can't be undone.", "Delete forever", true))) return;
    try { await api("/api/me/delete", { method: "POST", body: { password: ctx.view.querySelector("#pw").value } }); session.clear(); toast("Your account was deleted"); go("/home"); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
}
export { del as delete };

export async function payments(ctx) {
  ctx.top({ title: "My payments" });
  ctx.render(skeleton(4));
  let d;
  try { d = await api("/api/payments"); } catch (e) { ctx.render(errorBox(e)); return; }
  const st = { pending: ["sky", "Checking"], approved: ["bull", "Approved"], rejected: ["bear", "Rejected"] };
  ctx.render(html`<section class="panel">${(d.payments || []).length ? html`<div class="list">${d.payments.map((p) => html`<div class="li" style="align-items:start"><span><span class="t">#${p.id} ${planName(p.plan)} ${p.period}</span><span class="s">${p.amount_crypto}, ${date(p.created_at)}</span>${p.note ? html`<span class="s" style="white-space:normal">${p.note}</span>` : ""}<span class="s" style="font-family:ui-monospace,monospace;font-size:12px">${p.txid}</span></span>
      <span class="r"><span class="tag ${(st[p.status] || ["", p.status])[0]}">${(st[p.status] || ["", p.status])[1]}</span></span></div>`)}</div>`
    : html`<div class="empty"><b>No payments yet</b>Plans you buy with crypto on the website appear here.<div><a class="btn btn-gold btn-sm" href="#/upgrade">See plans</a></div></div>`}</section>
    <p class="note">Payments are checked by our team, usually within a few hours. Questions? <a href="${(session.config && session.config.contact && session.config.contact.telegram_url) || A.tg}" target="_blank" rel="noopener">Message support on Telegram</a>.</p>`);
}

export async function contact(ctx) {
  ctx.top({ title: "Contact" });
  const c = (session.config && session.config.contact) || {};
  ctx.render(html`<section class="panel"><div class="list">
    <a class="li" href="${c.telegram_url || A.tg}" target="_blank" rel="noopener"><span class="with-ic"><span class="lead-ic">💬</span><span><span class="t">Telegram support</span><span class="s">Fastest, usually within a few hours</span></span></span><span class="r">${icon.ext}</span></a>
    ${c.email ? html`<a class="li" href="mailto:${c.email}"><span class="with-ic"><span class="lead-ic">✉️</span><span><span class="t">Email</span><span class="s">${c.email}</span></span></span><span class="r">${icon.ext}</span></a>` : ""}
  </div></section><p class="note">Please include the email of your Alice account so we can find it quickly.</p>`);
}

export async function install(ctx) {
  ctx.top({ title: "Install Alice" });
  const cfg = (await loadConfig()) || {}, share = cfg.share || {};
  const apk = share.apk_file_url || share.apk_url, play = A.play || "", ios = A.ios || "";
  const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  ctx.render(html`
    ${standalone ? html`<div class="panel" style="border-color:rgba(22,199,132,.5)"><b>Alice is installed on this device</b><p class="note" style="margin:4px 0 0">You're using the installed web app.</p></div>` : ""}
    <section class="panel"><div class="panel-head"><h2>🍏 iPhone and iPad</h2>${ios ? "" : html`<span class="tag sky">App Store soon</span>`}</div>
      <ol class="ios-steps"><li><span>Open this page in <b>Safari</b></span></li><li><span>Tap the Share button ${icon.share}</span></li><li><span>Choose <b>Add to Home Screen</b>, then Add</span></li><li><span>Open Alice from its new icon. It runs full screen, like an app.</span></li></ol>
      ${ios ? html`<a class="btn btn-line btn-sm" style="margin-top:12px" href="${ios}" target="_blank" rel="noopener">Open the App Store</a>` : ""}</section>
    <section class="panel"><div class="panel-head"><h2>🤖 Android</h2></div>
      <p class="mt0">Get the full Android app with notifications for alerts, whales and Best Trades.</p>
      <div class="btn-row">${apk ? html`<a class="btn btn-gold btn-sm" href="${apk}">${icon.download} Download the APK${share.version_name ? " " + share.version_name : ""}</a>` : html`<span class="btn btn-line btn-sm" aria-disabled="true">APK coming soon</span>`}
        ${play ? html`<a class="btn btn-line btn-sm" href="${play}" target="_blank" rel="noopener">Google Play</a>` : html`<span class="note">Google Play: coming soon</span>`}</div></section>
    <section class="panel"><div class="panel-head"><h2>💻 Laptop and PC</h2></div><p class="mt0" style="margin:0">Use Alice in Chrome, Edge, Safari or Firefox. In Chrome or Edge you can also click the install icon in the address bar to open Alice in its own window.</p></section>`);
}

/* ------------------------------------------------------------------ language (the same 10 as the app) */
export async function language(ctx) {
  ctx.top({ title: "Language", sub: "The app language" });
  const draw = () => ctx.render(html`<section class="panel"><div class="list" data-notr>
    ${LANGS.map(([code, name]) => html`<button type="button" class="li lang-row" data-lang="${code}" aria-pressed="${code === lang}"><span class="with-ic"><span class="lead-ic">${code.toUpperCase()}</span><span class="t">${name}</span></span><span class="r">${code === lang ? icon.check : ""}</span></button>`)}
  </div></section><p class="note">Menus, buttons and screens change language. Market analyses, lessons and chat messages stay as written.</p>`);
  ctx.on("[data-lang]", "click", async (e, b) => {
    const l = b.dataset.lang;
    await setLang(l);
    if (session.loggedIn) await api("/api/me", { method: "PATCH", body: { language: l } }).then((r) => r && r.user && session.setUser(r.user)).catch(() => {});
    await push.resync();
    location.reload();
  });
  draw();
}
