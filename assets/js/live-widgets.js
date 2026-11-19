/* Website live widgets: market mood meter (needle gauges) and VIP signal room results. */
(function () {
  "use strict";
  var API = (window.ALICE && window.ALICE.api) || "";
  if (!API) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function get(p) { return fetch(API + p, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }); }
  function seg(a0, a1, c) {
    function pt(a) { return [100 + 80 * Math.cos((a - 180) * Math.PI / 180), 100 + 80 * Math.sin((a - 180) * Math.PI / 180)]; }
    var p0 = pt(a0), p1 = pt(a1);
    return '<path d="M' + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + " A80 80 0 0 1 " + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + '" stroke="' + c + '" stroke-width="16" fill="none"/>';
  }
  function gauge(v, label, big) {
    v = Math.max(0, Math.min(100, Number(v) || 50));
    var cls = v >= 55 ? "up" : v <= 45 ? "down" : "";
    return '<div class="gauge' + (big ? " big" : "") + '"><svg viewBox="0 0 200 118" role="img" aria-label="' + esc(label) + ": " + Math.round(v) + ' of 100">' +
      seg(0, 35, "#EA3943") + seg(36, 71, "#F0766E") + seg(72, 107, "#8A94A8") + seg(108, 143, "#5BD49A") + seg(144, 180, "#16C784") +
      '<g class="gauge-needle" style="transform:rotate(-90deg)" data-ang="' + (-90 + v * 1.8) + '"><path d="M97 100 L100 26 L103 100 Z" fill="currentColor"/></g>' +
      '<circle cx="100" cy="100" r="9" fill="currentColor"/><circle cx="100" cy="100" r="4" fill="#0B0F17"/>' +
      (big ? '<text x="16" y="116" font-size="10" fill="#EA3943">Bearish</text><text x="184" y="116" font-size="10" fill="#16C784" text-anchor="end">Bullish</text>' : "") +
      '</svg><div class="gauge-v ' + cls + '">' + Math.round(v) + '</div><div class="gauge-l">' + esc(label) + "</div></div>";
  }
  function spin(root) {
    requestAnimationFrame(function () { setTimeout(function () {
      root.querySelectorAll(".gauge-needle").forEach(function (n) { n.style.transform = "rotate(" + n.getAttribute("data-ang") + "deg)"; });
    }, 60); });
  }

  var box = document.getElementById("mood-meter");
  if (box) {
    var app = box.getAttribute("data-app") || "/app/", data = null, group = "crypto";
    var draw = function () {
      var gs = data.groups || {}, keys = Object.keys(gs);
      if (!keys.length) { box.innerHTML = '<p class="muted center">The meter is warming up. Open the app for the live scanner.</p>'; return; }
      if (!gs[group]) group = keys[0];
      var g = gs[group];
      var row = function (a) {
        return '<a class="mm-row" href="' + app + "#/m/" + encodeURIComponent(a.market) + "/" + encodeURIComponent(a.symbol) + '?tf=1h"><span><b>' + esc(a.display) +
          "</b><small>" + esc(a.label) + '</small></span><span class="mini-meter"><i style="left:' + a.score + '%"></i></span><b class="' + (a.score >= 55 ? "up" : a.score <= 45 ? "down" : "") + '">' + a.score + "</b></a>";
      };
      box.innerHTML = '<div class="mm-top">' + gauge(data.overall.value, "All markets · " + data.overall.label, true) + '<div class="mm-groups">' +
        keys.map(function (k) { return '<button type="button" data-g="' + k + '" aria-pressed="' + (k === group) + '">' + gauge(gs[k].value, gs[k].name, false) + "</button>"; }).join("") +
        '</div></div><div class="mm-lists"><div><h3 class="up">📈 Strongest bullish · ' + esc(g.name) + "</h3>" + (g.strong_bullish.map(row).join("") || '<p class="muted">None right now.</p>') +
        '</div><div><h3 class="down">📉 Strongest bearish · ' + esc(g.name) + "</h3>" + (g.strong_bearish.map(row).join("") || '<p class="muted">None right now.</p>') + "</div></div>" +
        '<p class="muted mm-note">' + g.bullish + " bullish · " + g.bearish + " bearish of " + g.total + " " + esc(g.name.toLowerCase()) + ' markets on the 1-hour chart. <a href="' + app + '#/home">Open the live meter</a></p>';
      spin(box);
    };
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-g]"); if (b && data) { group = b.getAttribute("data-g"); draw(); } });
    var load = function () { get("/api/markets/meter").then(function (d) { data = d; draw(); }).catch(function () { if (!data) box.innerHTML = '<p class="muted center">Live data is not reachable right now.</p>'; }); };
    load(); setInterval(function () { if (!document.hidden) load(); }, 90000);
  }

  var vip = document.querySelectorAll("[data-vip-results]");
  if (vip.length) {
    get("/api/vip/results").then(function (d) {
      var feeds = d.feeds || {};
      document.querySelectorAll("[data-vip-feed]").forEach(function (card) {
        var f = feeds[card.getAttribute("data-vip-feed")];
        if (!f) return;
        var s = f.stats || {};
        var set = function (k, v) { var el = card.querySelector('[data-k="' + k + '"]'); if (el) el.textContent = v; };
        set("win_rate", s.win_rate == null ? "New" : s.win_rate + "%");
        set("closed", s.closed);
        set("all_targets", s.all_targets);
        var w = card.querySelector('[data-k="wins"]');
        if (w && (f.recent_wins || []).length) {
          w.innerHTML = f.recent_wins.slice(0, 4).map(function (x) {
            return "<span>✅ <b>" + esc(x.display) + "</b> " + esc(x.side) + " " + esc(x.result) + " <em>+" + x.gain + (x.unit === "pips" ? " pips" : "%") + "</em></span>";
          }).join("");
        }
      });
    }).catch(function () { /* the cards keep their text */ });
  }
})();
