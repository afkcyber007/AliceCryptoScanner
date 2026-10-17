/* News pages: latest crypto / forex / gold / US-stock headlines from the Alice server (cached there, 15 days kept). */
(function () {
  "use strict";
  var A = window.ALICE || {};
  var API = (A.api || "").replace(/\/$/, "");
  var BASE = A.base || "/";
  var CATS = { crypto: "Crypto", forex: "Forex", gold: "Gold", stocks: "US stocks" };
  var TOOLS = {
    crypto: [["📡", "Crypto scanner", "#/scanner"], ["₿", "BTC deep analysis", "#/btc"], ["🐋", "Whale radar", "#/activity"]],
    forex: [["💪", "Currency strength", "#/strength"], ["📅", "Economic calendar", "#/calendar"], ["🧮", "Risk calculator", "#/risk"]],
    gold: [["🥇", "Gold trade plan", "#/gold"], ["📅", "Economic calendar", "#/calendar"], ["📐", "Fibonacci and pivots", "#/fib"]],
    stocks: [["📈", "Stocks and indices scanner", "#/scanner"], ["🤖", "AI chart analyzer", "#/ai"], ["🔔", "Price alerts", "#/alerts"]]
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ago(ms) {
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " d ago";
  }
  function fallback(cat) { return BASE + "static/img/news/" + (CATS[cat] ? cat : "crypto") + ".webp"; }
  function img(it, cls) {
    var fb = fallback(it.cat);
    return '<img class="' + cls + '" src="' + esc(it.image || fb) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' + fb + '\'">';
  }
  function card(it) {
    var sum = (it.summary || "").length > 170 ? it.summary.slice(0, 170).replace(/\s+\S*$/, "") + "…" : (it.summary || "");
    return '<a class="news-card" href="' + BASE + 'news/read/?id=' + encodeURIComponent(it.id) + '">' + img(it, "nc-img") +
      '<span class="nc-body"><span class="nc-meta">' + (it.high_impact ? '<span class="tag hot">High impact</span>' : "") +
      '<span>' + esc(CATS[it.cat] || it.category) + " · " + esc(it.source) + " · " + ago(it.published_at) + "</span></span>" +
      "<b>" + esc(it.title) + "</b>" + (sum ? "<p>" + esc(sum) + "</p>" : "") + "</span></a>";
  }
  function get(path) {
    return fetch(API + path, { headers: { Accept: "application/json" } }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error((j && j.error && j.error.message) || "Not available"); return j; });
    });
  }
  function fail(box, msg) { box.innerHTML = '<div class="news-empty"><b>' + esc(msg || "The news could not be loaded.") + '</b><span>Check your connection and refresh the page.</span></div>'; }

  // ---------------------------------------------------------------- lists
  document.querySelectorAll("[data-news]").forEach(function (box) {
    var cat = box.getAttribute("data-news");
    if (cat === "top") {
      Promise.all(Object.keys(CATS).map(function (c) { return get("/api/news/feed?cat=" + c + "&limit=20").catch(function () { return { items: [] }; }); }))
        .then(function (res) {
          var all = [].concat.apply([], res.map(function (r) { return r.items || []; }));
          var hot = all.filter(function (x) { return x.high_impact; });
          var rest = all.filter(function (x) { return !x.high_impact; });
          hot.sort(function (a, b) { return b.published_at - a.published_at; });
          rest.sort(function (a, b) { return b.published_at - a.published_at; });
          var list = hot.slice(0, 12).concat(rest).slice(0, 12);
          if (!list.length) return fail(box, "No headlines right now.");
          box.innerHTML = list.map(card).join("");
        }).catch(function () { fail(box); });
      return;
    }
    get("/api/news/feed?cat=" + encodeURIComponent(cat) + "&limit=48").then(function (r) {
      var items = r.items || [];
      if (!items.length) return fail(box, "No headlines right now. The feeds refresh every few minutes.");
      box.innerHTML = items.map(card).join("");
    }).catch(function () { fail(box); });
  });

  // ---------------------------------------------------------------- one story
  var reader = document.getElementById("news-reader");
  if (!reader) return;
  var id = new URLSearchParams(location.search).get("id") || "";
  if (!id) { fail(reader, "Choose a story on the news page."); return; }
  get("/api/news/item?id=" + encodeURIComponent(id)).then(function (r) {
    var it = r.item;
    document.title = it.title + " | Alice Forex/Crypto Scanner";
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", (it.summary || it.title).slice(0, 155));
    var when = new Date(it.published_at);
    var aff = (it.affects || []).map(function (a) {
      return '<li><span>' + esc(a.label) + '</span><a class="btn btn-line btn-sm" href="' + BASE + "app/" + esc(a.route) + '">Check it in Alice</a></li>';
    }).join("");
    reader.innerHTML =
      '<div class="nr-meta"><a class="chip" href="' + BASE + "news/" + esc(it.cat) + '/">' + esc(CATS[it.cat] || it.category) + " news</a>" +
      (it.high_impact ? '<span class="tag hot">High impact</span>' : "") + "</div>" +
      '<h1 class="article-h1">' + esc(it.title) + "</h1>" +
      '<div class="article-meta"><span>Source: ' + esc(it.source) + "</span><span><time datetime=\"" + when.toISOString() + "\">" +
      when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) + "</time></span><span>" + ago(it.published_at) + "</span></div>" +
      '<figure class="article-cover">' + img(it, "nr-img") + "</figure>" +
      '<div class="prose">' + (it.summary ? "<p class=\"lead\">" + esc(it.summary) + "</p>" : "") +
      '<p><a class="btn btn-gold" href="' + esc(it.link) + '" target="_blank" rel="noopener nofollow">Read the full story on ' + esc(it.source) + " ↗</a></p>" +
      (aff ? '<div class="nr-box"><h2>What this news can move</h2><ul class="nr-aff">' + aff + "</ul></div>" : "") +
      '<div class="nr-box"><h2>How to trade a headline like this</h2><ol>' +
      "<li><b>Check the trend first.</b> Open the scanner and look at the 4H and daily score of the market in the news.</li>" +
      "<li><b>Look at the calendar.</b> A bigger release later today can reverse the first move.</li>" +
      "<li><b>Let the first reaction settle.</b> Spreads are wide in the first minutes; many traders wait 15 to 30 minutes.</li>" +
      "<li><b>Size the trade from your stop loss.</b> Risk a fixed 1% or less with the position size calculator.</li></ol></div>" +
      '<p class="disclaimer">The headline and summary belong to ' + esc(it.source) + " and are shown with a link to the original. This page is market information, not financial advice.</p></div>";
    var tools = document.getElementById("news-tools");
    if (tools) {
      tools.innerHTML = '<div class="tool-cta"><div><b>Click here to get the tools for this news</b><p>Free in the Alice web app. No download needed.</p></div><div class="nr-tools">' +
        (TOOLS[it.cat] || TOOLS.crypto).map(function (t) { return '<a class="btn btn-gold btn-sm" href="' + BASE + "app/" + t[2] + '">' + t[0] + " " + esc(t[1]) + "</a>"; }).join("") + "</div></div>";
    }
    var more = document.getElementById("news-more");
    if (more) {
      more.innerHTML = (r.more || []).map(card).join("") || "";
      var h = document.getElementById("news-more-h");
      if (h) h.textContent = "More " + (CATS[it.cat] || "market").toLowerCase() + " news";
    }
  }).catch(function (e) {
    reader.innerHTML = '<div class="news-empty"><b>' + esc(e.message || "This story is not available.") + '</b><span><a href="' + BASE + 'news/">See the latest news</a></span></div>';
  });
})();
