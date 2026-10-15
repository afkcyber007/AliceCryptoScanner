/* Live data on the public pages: home board, /scanner, pricing and download info. Talks to the Alice server. */
(function () {
  "use strict";
  var A = window.ALICE || {};
  var API = A.api || "";

  function get(path, timeout) {
    var ctl = "AbortController" in window ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, timeout || 12000) : null;
    return fetch(API + path, { signal: ctl ? ctl.signal : undefined, headers: { Accept: "application/json" } })
      .then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function price(p, market, symbol) {
    if (p == null || isNaN(p)) return "--";
    var d;
    if (market === "forex") d = /JPY/.test(symbol || "") ? 3 : 5;
    else if (p >= 10000) d = 0; else if (p >= 100) d = 2; else if (p >= 1) d = 4; else if (p >= 0.01) d = 5; else d = 8;
    return Number(p).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pct(v) { if (v == null || isNaN(v)) return ""; return (v >= 0 ? "+" : "") + Number(v).toFixed(2) + "%"; }
  function scoreClass(s) { return s >= 65 ? "s-bull" : s <= 35 ? "s-bear" : "s-neutral"; }
  function scoreHtml(s) {
    s = Math.round(s);
    return '<span class="score ' + scoreClass(s) + '" aria-label="Score ' + s + ' out of 100"><b>' + s + '</b><span class="track"><i style="left:' + Math.max(2, Math.min(98, s)) + '%"></i></span></span>';
  }
  function appLink(it) { return A.base + "app/#/m/" + encodeURIComponent(it.market) + "/" + encodeURIComponent(it.symbol) + "?tf=" + encodeURIComponent(it.tf || "1h"); }
  function rows(items, empty) {
    if (!items || !items.length) return '<li><span class="sym muted">' + esc(empty || "No setups right now") + '</span><span></span></li>';
    return items.map(function (it) {
      return '<li><a class="sym" style="color:inherit;text-decoration:none" href="' + appLink(it) + '">' + esc(it.display || it.symbol) +
        '<small>' + esc(it.label || "") + ' <span class="' + (it.change24h >= 0 ? "up" : "down") + '">' + pct(it.change24h) + '</span></small></a>' + scoreHtml(it.score) + '</li>';
    }).join("");
  }
  function ago(ms) {
    if (!ms) return "";
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 90) return "Updated just now";
    if (s < 3600) return "Updated " + Math.round(s / 60) + " min ago";
    return "Updated " + Math.round(s / 3600) + " h ago";
  }

  /* ------------------------------------------------------------- home board */
  var board = document.getElementById("live-board");
  if (board) {
    var overview = null, market = "crypto";
    var status = document.getElementById("board-status");
    var render = function () {
      if (!overview) return;
      var s = overview.sentiment || {};
      document.getElementById("mood-num").textContent = s.value != null ? s.value : "--";
      document.getElementById("mood-num").className = "mood-num " + (s.value >= 60 ? "up" : s.value <= 40 ? "down" : "");
      document.getElementById("mood-label").textContent = "Market mood: " + (s.label || "Neutral");
      document.getElementById("mood-mark").style.left = Math.max(2, Math.min(98, s.value || 50)) + "%";
      var want = [["BTCUSDT", "BTC/USDT"], ["XAUUSD", "Gold"], ["EURUSD", "EUR/USD"]];
      var q = overview.quotes || [];
      document.getElementById("board-quotes").innerHTML = want.map(function (w) {
        var it = q.filter(function (x) { return x.symbol === w[0]; })[0];
        if (!it) return '<div class="quote"><small>' + w[1] + '</small><b>--</b><span>&nbsp;</span></div>';
        return '<div class="quote"><small>' + w[1] + '</small><b>' + price(it.price, it.market, it.symbol) + '</b><span class="' + (it.change24h >= 0 ? "up" : "down") + '">' + pct(it.change24h) + '</span></div>';
      }).join("");
      var setups = (overview.setups || {})[market] || [];
      document.getElementById("board-setups").innerHTML = rows(setups.slice(0, 5), "The scanner is warming up");
      document.getElementById("board-time").textContent = ago(overview.updated_at) || "Scores update every few minutes";
    };
    var load = function () {
      get("/api/markets/overview").then(function (d) {
        overview = d; status.textContent = "Live"; status.className = "live-dot"; render();
      }).catch(function () {
        status.textContent = "Offline"; status.className = "live-dot off";
        if (!overview) document.getElementById("board-setups").innerHTML = '<li><span class="sym muted">Live data is not reachable right now. Open the app to try again.</span><span></span></li>';
      });
    };
    board.querySelectorAll(".board-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        market = b.getAttribute("data-market");
        board.querySelectorAll(".board-tabs button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        render();
      });
    });
    load(); setInterval(function () { if (!document.hidden) load(); }, 60000);
  }

  /* ------------------------------------------------------------- /scanner page */
  var sp = document.getElementById("scanner-page");
  if (sp) {
    var st = { market: "crypto", tf: "1h" };
    var seg = function (id, key) {
      document.querySelectorAll("#" + id + " button").forEach(function (b) {
        b.addEventListener("click", function () {
          st[key] = b.getAttribute("data-v");
          document.querySelectorAll("#" + id + " button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          scan();
        });
      });
    };
    var scan = function () {
      var bull = document.getElementById("scan-bull"), bear = document.getElementById("scan-bear"), s = document.getElementById("scan-status");
      s.textContent = "Loading";
      get("/api/scan?market=" + st.market + "&tf=" + st.tf).then(function (d) {
        var items = (d.items || []).slice().sort(function (a, b) { return b.score - a.score; });
        bull.innerHTML = rows(items.filter(function (x) { return x.score >= 50; }).slice(0, 8), "No bullish setups on this timeframe");
        bear.innerHTML = rows(items.filter(function (x) { return x.score < 50; }).reverse().slice(0, 8), "No bearish setups on this timeframe");
        var more = d.locked ? ". " + d.locked + " more markets in the full app" : "";
        s.textContent = (d.warming ? "The scanner is warming up, scores are filling in" : ago(d.updated_at)) + more;
      }).catch(function () {
        s.textContent = "Live data is not reachable right now";
        bull.innerHTML = bear.innerHTML = '<li><span class="sym muted">Try again in a minute</span><span></span></li>';
      });
    };
    seg("scan-market", "market"); seg("scan-tf", "tf"); scan();
    setInterval(function () { if (!document.hidden) scan(); }, 90000);
  }

  /* ------------------------------------------------------------- live prices, offer and APK info */
  var needCfg = document.querySelector("[data-price]") || document.querySelector("[data-apk-link]");
  if (needCfg) {
    get("/api/config").then(function (cfg) {
      (cfg.plans || []).forEach(function (p) {
        var el = document.querySelector('[data-price="' + p.id + '"]');
        var alt = document.querySelector('[data-alt="' + p.id + '"]');
        var offer = cfg.offer && cfg.offer.active ? cfg.offer : null;
        var op = offer && offer.prices ? offer.prices[p.id] : null;
        if (el) {
          if (op && op.monthly != null) el.innerHTML = '<s class="muted" style="font-size:20px">$' + p.monthly.toFixed(2) + '</s> $' + Number(op.monthly).toFixed(2) + '<small> / month</small>';
          else el.innerHTML = "$" + p.monthly.toFixed(2) + "<small> / month</small>";
        }
        if (alt) {
          var y = op && op.yearly != null ? op.yearly : p.yearly;
          var save = Math.round(100 - y / (p.monthly * 12) * 100);
          alt.textContent = "or $" + Number(y).toFixed(2) + " a year, save " + save + "%" + (offer && op ? " (" + offer.percent + "% off now)" : "");
        }
      });
      var share = cfg.share || {};
      var link = share.apk_file_url || share.apk_url;
      document.querySelectorAll("[data-apk-link]").forEach(function (a) {
        if (link) a.href = link;
        else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.textContent = "APK coming soon"; }
      });
      document.querySelectorAll("[data-apk-version]").forEach(function (s) {
        if (share.version_name) s.textContent = "Version " + share.version_name + (share.size_mb ? ", " + share.size_mb + " MB" : "");
      });
    }).catch(function () { /* keep the built-in prices */ });
  }
})();
