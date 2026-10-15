/* Log in, sign up and password reset. Same accounts as the Android app. */
import { A, html, raw, api, session, go, store, toast, icon, loadConfig, refreshMe } from "../core.js";

const FOUND_VIA = ["Telegram", "Twitter (X)", "Instagram", "Facebook", "YouTube", "TikTok", "Google", "Promotion", "Friend", "Other"];
const EXCHANGES = ["Bitunix", "Binance", "Bybit", "OKX", "Bitget", "MEXC", "KuCoin", "Gate.io", "HTX", "BingX", "Coinbase", "Kraken", "Other"];
const COUNTRY_CODES = "AF AL DZ AD AO AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW".split(" ");
function countries() {
  let dn = null; try { dn = new Intl.DisplayNames(["en"], { type: "region" }); } catch { }
  return COUNTRY_CODES.map((c) => (dn ? dn.of(c) : c)).sort((a, b) => a.localeCompare(b));
}
function guessCountry() {
  try {
    const loc = (navigator.language || "").split("-")[1];
    if (loc) return new Intl.DisplayNames(["en"], { type: "region" }).of(loc.toUpperCase());
  } catch { }
  return "";
}
const pw = (id, label, auto) => html`<div class="field"><label for="${id}">${label}</label><div class="pw"><input id="${id}" name="${id}" type="password" autocomplete="${auto}" minlength="8" required><button type="button" data-show="${id}">Show</button></div></div>`;
function wirePw(root) {
  root.querySelectorAll("[data-show]").forEach((b) => b.addEventListener("click", () => {
    const i = root.querySelector("#" + b.dataset.show); const show = i.type === "password"; i.type = show ? "text" : "password"; b.textContent = show ? "Hide" : "Show";
  }));
}
function afterLogin(ctx) {
  const next = ctx.query.next;
  loadConfig(true);
  go(next && next.startsWith("/") ? next : "/home");
}

export async function login(ctx) {
  ctx.top({ title: "Log in", sub: "Welcome back" });
  if (session.loggedIn) { go("/profile"); return; }
  ctx.render(html`<div class="auth">
    <div class="auth-hero"><img src="${A.base}static/img/icons/icon-192.png" width="72" height="72" alt=""><h2>Welcome back</h2><p>Log in with the same account you use in the Android app.</p></div>
    <form class="panel form" id="f" novalidate style="margin-top:18px">
      <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="email" inputmode="email" required></div>
      ${pw("password", "Password", "current-password")}
      <p class="err" id="err" role="alert" hidden></p>
      <button class="btn btn-gold btn-block" type="submit">Log in</button>
      <div class="btn-row" style="justify-content:space-between"><a href="#/forgot">Forgot password?</a><a href="#/signup${ctx.query.next ? "?next=" + encodeURIComponent(ctx.query.next) : ""}">Create a free account</a></div>
    </form>
    <p class="note center" style="margin-top:16px">By logging in you agree to the <a href="${A.base}terms/">Terms</a> and <a href="${A.base}disclaimer/">Risk disclaimer</a>.</p>
  </div>`);
  const f = ctx.view.querySelector("#f"); wirePw(f);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = f.querySelector("#err"); err.hidden = true;
    const email = f.querySelector("#email").value.trim(), password = f.querySelector("#password").value;
    if (!email || !password) { err.textContent = "Enter your email and password."; err.hidden = false; return; }
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Logging in…";
    try {
      const r = await api("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
      session.set(r.token, r.user);
      toast("Welcome back, " + (r.user.name || "trader").split(" ")[0]);
      afterLogin(ctx);
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = "Log in"; }
  });
}

export async function signup(ctx) {
  ctx.top({ title: "Create account", sub: "Free plan included" });
  if (session.loggedIn) { go("/home"); return; }
  if (ctx.query.ref) store.set("ref", String(ctx.query.ref).toUpperCase().slice(0, 12));
  const ref = store.get("ref", "");
  const list = countries(), mine = guessCountry();
  ctx.render(html`<div class="auth">
    <div class="auth-hero"><img src="${A.base}static/img/icons/icon-192.png" width="72" height="72" alt=""><h2>Join Alice in 30 seconds</h2><p>One account for the website, Android and iPhone.</p></div>
    <form class="panel form" id="f" novalidate style="margin-top:18px">
      <div class="field"><label for="name">Full name</label><input id="name" autocomplete="name" maxlength="40" required></div>
      <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="email" inputmode="email" required></div>
      <div class="field"><label for="country">Country</label><select id="country"><option value="">Choose your country</option>${list.map((c) => html`<option ${c === mine ? raw("selected") : ""}>${c}</option>`)}</select></div>
      <div class="field"><label for="dob">Date of birth</label><input id="dob" type="date" max="${new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)}" required><small>Needed to reset your password if you forget it</small></div>
      ${pw("password", "Password (at least 8 characters)", "new-password")}
      ${pw("confirm", "Confirm password", "new-password")}
      <div class="field"><label for="found">Where did you find us?</label><select id="found"><option value="">Choose one</option>${FOUND_VIA.map((x) => html`<option>${x}</option>`)}</select></div>
      <details class="field"><summary style="cursor:pointer;color:#C3CAD8;font-weight:600">Your crypto exchange and referral code (optional)</summary>
        <div class="form" style="margin-top:12px">
          <div class="field"><label for="exch">Exchange name</label><select id="exch"><option value="">None</option>${EXCHANGES.map((x) => html`<option>${x}</option>`)}</select></div>
          <div class="field"><label for="uid">Exchange UID</label><input id="uid" maxlength="40" autocomplete="off"><small>Real exchange name and UID take part in future lucky draws.</small></div>
          <div class="field"><label for="ref">Referral code</label><input id="ref" maxlength="12" value="${ref}" autocapitalize="characters" autocomplete="off"><small>Invited by a friend? Enter their code and get bonus coins.</small></div>
        </div>
      </details>
      <label class="check"><input type="checkbox" id="terms"><span>I accept the <a href="${A.base}terms/" target="_blank">Terms</a> and <a href="${A.base}disclaimer/" target="_blank">Risk disclaimer</a>. I understand Alice provides market analysis, not financial advice.</span></label>
      <p class="err" id="err" role="alert" hidden></p>
      <button class="btn btn-gold btn-block" type="submit">Create account</button>
      <p class="center" style="margin:0"><a href="#/login${ctx.query.next ? "?next=" + encodeURIComponent(ctx.query.next) : ""}">Already have an account? Log in</a></p>
    </form>
  </div>`);
  const f = ctx.view.querySelector("#f"); wirePw(f);
  const v = (id) => f.querySelector("#" + id).value.trim();
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = f.querySelector("#err"); err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    if (v("name").length < 2) return fail("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(v("email"))) return fail("Enter a valid email address.");
    if (!v("dob")) return fail("Enter your date of birth. It's used to reset your password.");
    if (f.querySelector("#password").value.length < 8) return fail("Password must be at least 8 characters.");
    if (f.querySelector("#password").value !== f.querySelector("#confirm").value) return fail("The passwords don't match.");
    if (v("uid") && !/^[A-Za-z0-9_-]{3,40}$/.test(v("uid"))) return fail("Exchange UID can contain only letters and numbers.");
    if (!f.querySelector("#terms").checked) return fail("Please accept the Terms and Risk disclaimer.");
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Creating your account…";
    try {
      const r = await api("/api/auth/signup", { method: "POST", auth: false, body: {
        name: v("name"), email: v("email"), password: f.querySelector("#password").value, country: v("country"),
        market_focus: "both", accept_terms: true, dob: v("dob"), found_via: v("found"), exchange: v("uid") || v("exch") ? v("exch") : "",
        exchange_uid: v("uid"), language: (navigator.language || "en").slice(0, 2), ref_code: v("ref").toUpperCase(), platform: "web",
      } });
      session.set(r.token, r.user); store.del("ref");
      toast("Welcome to Alice! Your free account is ready.");
      afterLogin(ctx);
    } catch (ex) { fail(ex.message); btn.disabled = false; btn.textContent = "Create account"; }
  });
}

export async function forgot(ctx) {
  ctx.top({ title: "Reset password" });
  ctx.render(html`<div class="auth">
    <form class="panel form" id="f" novalidate>
      <div><h2 style="font-size:20px;margin:0 0 4px">Forgot your password?</h2><p class="muted" style="margin:0">Enter your account email and the date of birth you used when signing up, then choose a new password.</p></div>
      <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="dob">Date of birth</label><input id="dob" type="date" required></div>
      ${pw("password", "New password (at least 8 characters)", "new-password")}
      <p class="err" id="err" role="alert" hidden></p>
      <button class="btn btn-gold btn-block" type="submit">Reset password and log in</button>
    </form>
    <div class="panel" style="margin-top:14px"><p style="margin:0 0 10px">Account created before date of birth was added, or still stuck? Our team can reset it for you.</p>
      <a class="btn btn-line btn-sm" href="${A.tg || "https://t.me/AliceSupportTeam"}" target="_blank" rel="noopener">${icon.telegram} Message support on Telegram</a></div>
  </div>`);
  const f = ctx.view.querySelector("#f"); wirePw(f);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = f.querySelector("#err"); err.hidden = true;
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const r = await api("/api/auth/reset-dob", { method: "POST", auth: false, body: {
        email: f.querySelector("#email").value.trim(), dob: f.querySelector("#dob").value, new_password: f.querySelector("#password").value } });
      session.set(r.token, r.user); toast("Password changed. You're logged in."); go("/home");
    } catch (ex) {
      err.textContent = ex.message; err.hidden = false; btn.disabled = false;
      if (ex.code === "no_dob") api("/api/auth/forgot", { method: "POST", auth: false, body: { email: f.querySelector("#email").value.trim() } }).catch(() => {});
    }
  });
}
