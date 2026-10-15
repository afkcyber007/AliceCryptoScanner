/* Rewards: coins, referrals, gifts, converting coins to Premium/Elite, and Spin & Earn. */
import { A, html, raw, api, session, refreshMe, int, date, skeleton, errorBox, needLogin, toast, copy, shareText, confirmSheet, plan } from "../core.js";
import { sponsoredBreak } from "../components.js";

const refLink = (code) => (A.site || location.origin) + (A.base || "/") + "app/#/signup?ref=" + encodeURIComponent(code);

export async function rewards(ctx) {
  ctx.top({ title: "Rewards and referral", sub: "Invite friends, convert coins" });
  if (!session.loggedIn) { ctx.render(needLogin("rewards")); return; }
  let d = null;
  const draw = () => {
    if (!d) { ctx.render(skeleton(5, 70)); return; }
    const r = d.rates || {}, link = refLink(d.ref_code);
    ctx.render(html`
      <section class="panel" style="text-align:center;background:linear-gradient(180deg,rgba(245,185,65,.12),var(--s1))">
        <div class="note">Your coins</div><div style="font:700 44px/1.1 var(--display);color:var(--gold);font-variant-numeric:tabular-nums">${int(d.coins)}</div>
        <p class="note" style="margin:6px 0 14px">${int(r.premium_month)} coins = 1 month Premium. ${int(r.elite_month)} coins = 1 month Elite.</p>
        <div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="#/spin">🎡 Spin and earn</a></div>
      </section>
      ${d.pending_redemption ? html`<div class="panel" style="border-color:rgba(59,167,255,.45)"><b>Conversion waiting for approval</b><p class="note" style="margin:4px 0 0">1 month ${d.pending_redemption.plan} for ${int(d.pending_redemption.coins)} coins, requested ${date(d.pending_redemption.created_at)}. Our team usually approves within a few hours.</p></div>` : ""}
      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h2>Invite friends</h2></div>
          <p class="mt0" style="margin:0 0 10px">You get <b>${r.per_referral} coins</b> for each friend who signs up with your code and comes back on another day. They get ${r.welcome} coins too.</p>
          <div class="copy-box"><span>${d.ref_code}</span><button class="btn btn-line btn-sm" data-copy="${d.ref_code}">Copy code</button></div>
          <div class="btn-row" style="margin-top:10px"><button class="btn btn-gold btn-sm" data-share>Share invite link</button><button class="btn btn-line btn-sm" data-copy="${link}">Copy link</button></div>
          <div class="kv" style="margin-top:14px"><div><small>Invited</small><b>${d.referrals.total}</b></div><div><small>Qualified</small><b>${d.referrals.qualified}</b></div><div><small>Pending</small><b>${d.referrals.pending}</b></div></div>
        </section>
        <section class="panel"><div class="panel-head"><h2>Convert coins</h2></div>
          <p class="note mt0">Coins are reserved now and our team approves the conversion, usually within a few hours. If you already have a plan, it is extended.</p>
          <div class="btn-row"><button class="btn btn-line" data-redeem="premium" ${d.coins < r.premium_month || d.pending_redemption ? raw("disabled") : ""}>1 month Premium, ${int(r.premium_month)}</button>
            <button class="btn btn-gold" data-redeem="elite" ${d.coins < r.elite_month || d.pending_redemption ? raw("disabled") : ""}>1 month Elite, ${int(r.elite_month)}</button></div>
          <form class="form" id="gift" style="margin-top:16px"><b>Send coins to a friend</b>
            <div class="fields"><div class="field"><label for="g-email">Friend's email</label><input id="g-email" type="email" required></div><div class="field"><label for="g-amt">Coins (min ${r.min_gift})</label><input id="g-amt" type="number" min="${r.min_gift}" step="1" inputmode="numeric" required></div></div>
            <button class="btn btn-line btn-sm" type="submit">Send coins</button></form>
        </section>
      </div>
      <section class="panel"><div class="panel-head"><h2>How coins work</h2></div><ul class="prose-sm" style="margin:0;padding-left:18px">${(d.rules || []).map((x) => html`<li>${x.replace("one short video ad", "a short sponsored message")}</li>`)}</ul></section>
      <section class="panel"><div class="panel-head"><h2>History</h2></div>
        ${(d.history || []).length ? html`<div class="list">${d.history.map((h) => html`<div class="li"><span><span class="t">${h.note || h.kind}</span><span class="s">${date(h.created_at)}</span></span><span class="r"><b class="${h.amount >= 0 ? "up" : "down"}">${h.amount >= 0 ? "+" : ""}${int(h.amount)}</b></span></div>`)}</div>` : html`<p class="note mt0" style="margin:0">No coins yet. Spin the wheel or invite a friend to start.</p>`}
      </section>`);
  };
  const load = async () => { try { d = await api("/api/coins"); } catch (e) { ctx.render(errorBox(e)); return; } if (ctx.alive) draw(); };
  ctx.on("[data-copy]", "click", (e, b) => copy(b.dataset.copy));
  ctx.on("[data-share]", "click", () => shareText((d.share_text || "Join me on Alice Forex/Crypto Scanner with my code " + d.ref_code).split("\n")[0] + " Code: " + d.ref_code, refLink(d.ref_code)));
  ctx.on("[data-redeem]", "click", async (e, b) => {
    const p = b.dataset.redeem;
    if (!(await confirmSheet("Convert coins to " + (p === "elite" ? "Elite" : "Premium") + "?", "The coins are reserved now. If our team rejects the request, they are refunded.", "Convert"))) return;
    try { const r = await api("/api/coins/redeem", { method: "POST", body: { plan: p } }); toast(r.message || "Request sent"); refreshMe(); load(); } catch (ex) { toast(ex.message); }
  });
  ctx.on("#gift", "submit", async (e) => {
    e.preventDefault();
    const email = ctx.view.querySelector("#g-email").value.trim(), amount = parseInt(ctx.view.querySelector("#g-amt").value, 10);
    if (!(await confirmSheet("Send " + amount + " coins?", "Coins go to " + email + ". This can't be undone.", "Send"))) return;
    try { const r = await api("/api/coins/gift", { method: "POST", body: { email, amount } }); toast("Sent to " + r.to); refreshMe(); load(); } catch (ex) { toast(ex.message); }
  });
  draw(); await load();
}

export async function spin(ctx) {
  ctx.top({ title: "Spin and earn", sub: "Collect coins for Premium and Elite" });
  if (!session.loggedIn) { ctx.render(html`${needLogin("Spin and earn")}<p class="note center">Every spin gives coins. 5,000 coins = 1 month Premium.</p>`); return; }
  let d = null, busy = false, rot = 0, msg = "";
  const COLORS = ["#7C5CFF", "#16C784", "#3BA7FF", "#F5B941", "#E879B9", "#F59E0B", "#22B8CF", "#EA3943", "#A898FF", "#5BD49A"];
  const draw = () => {
    if (!d) { ctx.render(skeleton(1, 340)); return; }
    const s = d.spin, wheel = s.wheel || [], n = wheel.length || 1, seg = 360 / n;
    const grad = wheel.map((_, i) => `${COLORS[i % COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(",");
    const labels = wheel.map((v, i) => `<span class="wl" style="transform:rotate(${i * seg + seg / 2}deg)"><span>${v}</span></span>`).join("");
    ctx.render(html`
      <section class="panel center">
        <div class="note">Your coins</div><div id="bal" style="font:700 34px/1.1 var(--display);color:var(--gold)">${int(d.coins)}</div>
        <div class="wheel-box"><div class="wheel-pin"></div><div class="wheel" id="wheel" style="background:conic-gradient(${grad});transform:rotate(${rot}deg)">${raw(labels)}</div><div class="wheel-hub">SPIN</div></div>
        <button class="btn btn-gold" data-spin ${busy || !s.available || s.left_today <= 0 ? raw("disabled") : ""} style="min-width:200px">${busy ? "Spinning…" : s.left_today > 0 ? "Spin the wheel" : "No spins left today"}</button>
        <p class="note" style="margin:10px 0 0">${s.left_today} of ${s.per_day} spins left today. Each spin starts with a short sponsored message.</p>
        <p id="msg" style="font-weight:700;color:var(--bull);min-height:1.4em;margin:10px 0 0">${msg}</p>
      </section>
      <a class="banner upgrade" href="#/rewards"><span class="emo">🤝</span><span><b>Invite friends for ${d.rates.per_referral} coins each</b><span class="muted">${int(d.rates.premium_month)} coins = 1 month Premium, ${int(d.rates.elite_month)} = Elite</span></span>${raw('<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>')}</a>`);
  };
  const load = async () => { try { d = await api("/api/coins"); } catch (e) { ctx.render(errorBox(e)); return; } if (ctx.alive) draw(); };
  ctx.on("[data-spin]", "click", async () => {
    if (busy) return;
    busy = true; msg = ""; draw();
    let token;
    try { token = (await api("/api/coins/spin/start", { method: "POST" })).token; }
    catch (e) { busy = false; msg = ""; draw(); toast(e.message); return; }
    if (plan() === "free") await sponsoredBreak(6, "Your spin is almost ready");
    else await new Promise((r) => setTimeout(r, 5200));     // the server needs a few seconds between start and spin
    try {
      const r = await api("/api/coins/spin", { method: "POST", body: { token } });
      const n = d.spin.wheel.length, seg = 360 / n;
      const target = 360 - (r.index * seg + seg / 2);
      rot = rot - (rot % 360) + 360 * 6 + target;
      const w = ctx.view.querySelector("#wheel"); if (w) w.style.transform = `rotate(${rot}deg)`;
      setTimeout(() => {
        if (!ctx.alive) return;
        d.coins = r.balance; d.spin.left_today = r.left_today; busy = false; msg = "+" + r.coins + " coins!";
        session.user && session.setUser({ ...session.user, coins: r.balance });
        draw();
      }, 4300);
    } catch (e) { busy = false; draw(); toast(e.message); }
  });
  draw(); await load();
}
