/* Currency strength meter + crypto peak hours (live from the Alice server) and new partner exchanges. */
(function () {
  "use strict";
  var A = window.ALICE || {};
  var API = (A.api || "").replace(/\/$/, "");
  var BASE = A.base || "/";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function get(p) { return fetch(API + p).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
  var FLAGS = { USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺", NZD: "🇳🇿", CAD: "🇨🇦", CHF: "🇨🇭" };

  // ---------------------------------------------------------------- currency strength meter
  var bars = document.getElementById("csm-bars");
  if (bars) {
    var tf = "1h", timer = null;
    var load = function () {
      get("/api/strength?tf=" + tf).then(function (d) {
        var rows = (d.rows || []).slice().sort(function (a, b) { return b.strength - a.strength; });
        bars.innerHTML = rows.map(function (r) {
          var v = Math.max(3, Math.min(100, r.strength * 10));
          var cls = r.strength >= 6 ? "s-up" : r.strength <= 4 ? "s-down" : "s-mid";
          var ch = r.change_pct == null ? "" : '<small class="' + (r.change_pct >= 0 ? "up" : "down") + '">' + (r.change_pct >= 0 ? "+" : "") + Number(r.change_pct).toFixed(2) + "%</small>";
          return '<div class="csm-row"><span class="csm-cur">' + (FLAGS[r.currency] || "") + " <b>" + esc(r.currency) + "</b>" + ch + '</span><span class="csm-track"><i class="' + cls + '" style="width:' + v + '%"></i></span><b class="csm-val">' + Number(r.strength).toFixed(1) + "</b></div>";
        }).join("");
        var idea = document.getElementById("csm-idea");
        if (idea && d.idea && d.idea.pair) {
          idea.hidden = false;
          idea.href = BASE + "app/#/m/forex/" + encodeURIComponent(d.idea.pair);
          idea.innerHTML = "<span>💡</span><span><b>" + esc(d.idea.pair) + ": " + esc(d.idea.bias) + "</b><small>" + esc(d.idea.text || "Strongest against weakest currency") + '</small></span><span class="tag ' + (/BUY/i.test(d.idea.bias) ? "bull" : "bear") + '">Open chart</span>';
        }
      }).catch(function () { bars.innerHTML = '<div class="news-empty"><b>The live meter is not reachable right now.</b><span>Please try again in a minute.</span></div>'; });
    };
    document.querySelectorAll("[data-csm-tf]").forEach(function (b) {
      b.addEventListener("click", function () {
        tf = b.getAttribute("data-csm-tf");
        document.querySelectorAll("[data-csm-tf]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        load();
      });
    });
    load(); timer = setInterval(function () { if (!document.hidden) load(); }, 60000);
  }

  // ---------------------------------------------------------------- crypto peak hours
  var ch = document.getElementById("crypto-hours");
  if (ch) {
    var local = true, data = null;
    var draw = function () {
      if (!data) return;
      var off = local ? -new Date().getTimezoneOffset() / 60 : 0;
      var lab = function (h) { return String((((h + off) % 24) + 24) % 24).padStart(2, "0") + ":00"; };
      var max = Math.max.apply(null, data.hours.map(function (h) { return h.volume; }).concat([1]));
      var nowH = new Date().getUTCHours();
      var col = { high: "var(--bull)", medium: "var(--gold)", low: "var(--faint)" };
      var hrs = data.hours.slice().sort(function (a, b) { return ((a.hour + off + 24) % 24) - ((b.hour + off + 24) % 24); });
      ch.innerHTML = '<div class="ch-bars" role="img" aria-label="Crypto trading volume by hour">' + hrs.map(function (h) {
        return '<span title="' + lab(h.hour) + ": " + esc(h.level) + ' activity" style="height:' + Math.max(6, h.volume / max * 100) + "%;background:" + (col[h.level] || "var(--sky)") + (h.hour === nowH ? ";outline:2px solid var(--text)" : "") + '"></span>';
      }).join("") + '</div><div class="ch-axis"><span>' + lab(hrs[0].hour) + "</span><span>" + lab(hrs[6].hour) + "</span><span>" + lab(hrs[12].hour) + "</span><span>" + lab(hrs[18].hour) + "</span><span>" + lab(hrs[23].hour) + "</span></div>" +
        '<div class="ch-legend"><span><i style="background:var(--bull)"></i>Peak hours</span><span><i style="background:var(--gold)"></i>Medium</span><span><i style="background:var(--faint)"></i>Quiet</span><span>Outlined: now</span></div>' +
        '<div class="ch-sum"><div><small>Busiest hours</small><b>' + (data.best_hours || []).map(lab).sort().join(", ") + "</b></div><div><small>Quietest hours</small><b>" + (data.quiet_hours || []).map(lab).sort().join(", ") + "</b></div>" +
        (data.weekend_vs_weekday != null ? "<div><small>Weekend volume</small><b>" + data.weekend_vs_weekday + "% of a weekday</b></div>" : "") + "</div>";
    };
    document.querySelectorAll("[data-ch-local]").forEach(function (b) {
      b.addEventListener("click", function () {
        local = b.getAttribute("data-ch-local") === "1";
        document.querySelectorAll("[data-ch-local]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        draw();
      });
    });
    get("/api/crypto/hours").then(function (d) { data = d; draw(); })
      .catch(function () { ch.innerHTML = '<div class="news-empty"><b>Crypto peak hours are not reachable right now.</b><span>Please try again in a minute.</span></div>'; });
  }

  // ---------------------------------------------------------------- partner exchanges added later on the server
  var more = document.getElementById("exc-more");
  if (more) {
    var known = (more.getAttribute("data-known") || "").split(",");
    get("/api/exchanges").then(function (d) {
      var extra = (d.items || []).filter(function (x) { return known.indexOf(x.id) < 0; });
      if (!extra.length) return;
      more.innerHTML = "<h2 style=\"margin-top:40px\">More partner platforms</h2><div class=\"exc-grid\">" + extra.map(function (x) {
        return '<section class="exc" style="--acc:' + esc(x.color || "#F5B941") + '"><div class="exc-head"><span class="exc-logo">' + esc((x.name || "?")[0]) + "</span><div><h3>" + esc(x.name) + '</h3><span class="tag ' + (x.category === "crypto" ? "gold" : "sky") + '">' + (x.category === "crypto" ? "Crypto exchange" : "Forex broker") + "</span></div></div>" +
          (x.fee_highlight ? '<p class="exc-bonus">🎁 ' + esc(x.fee_highlight) + "</p>" : "") +
          '<ul class="ticks">' + (x.features || []).map(function (f) { return "<li><span>✓</span><span>" + esc(f) + "</span></li>"; }).join("") + "</ul>" +
          '<a class="btn btn-gold" href="' + esc(x.url) + '" target="_blank" rel="noopener sponsored">Sign up with ' + esc(x.name) + "</a></section>";
      }).join("") + "</div>";
    }).catch(function () {});
  }
})();
