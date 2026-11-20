/* Trading-robot pages: loads the newest trade screenshots (and client feedback) from the Alice server.
   New photos posted in the robot Telegram channel appear here automatically. */
(function () {
  "use strict";
  var API = (window.ALICE && window.ALICE.api) || "";
  if (!API) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function day(ms) {
    try { return new Date(ms).toLocaleDateString(document.documentElement.lang || undefined, { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return new Date(ms).toDateString(); }
  }
  function weekLabel(ms) {
    var days = (Date.now() - ms) / 864e5;
    return days < 7 ? "This week" : days < 14 ? "Last week" : "";
  }
  function card(i, review) {
    var w = review ? "" : weekLabel(i.created_at);
    return '<a class="rb-shot" href="' + esc(i.url) + '" target="_blank" rel="noopener">' + (w ? '<em class="rb-week">' + w + "</em>" : "")
      + '<img src="' + esc(i.url) + '" alt="' + esc(i.caption || (review ? "Trader feedback" : "Robot trade result")) + '" loading="lazy" decoding="async">'
      + "<span>" + esc((i.caption || "").slice(0, 120)) + '<time datetime="' + new Date(i.created_at).toISOString() + '">' + day(i.created_at) + "</time></span></a>";
  }
  // Daily results: the newest 10+ days, one row per day
  var NAME = { forex: "Forex robot", gold: "Gold robot", crypto: "Crypto robot" };
  document.querySelectorAll(".rb-days").forEach(function (box) {
    var market = box.getAttribute("data-market") || "", days = box.getAttribute("data-days") || "10";
    fetch(API + "/api/robot/results?limit=120&days=" + days + (market ? "&market=" + encodeURIComponent(market) : ""), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var items = (d && d.items) || [];
        if (!items.length) return;
        var groups = [], by = {};
        items.forEach(function (i) {
          var k = i.day || new Date(i.created_at).toISOString().slice(0, 10);
          if (!by[k]) { by[k] = []; groups.push(k); }
          by[k].push(i);
        });
        var name = NAME[market] || "Robot";
        box.innerHTML = groups.map(function (k) {
          var its = by[k], label = day(Date.parse(k + "T12:00:00Z"));
          return '<div class="rb-day"><h3><time datetime="' + k + '">' + label + "</time><small>" + its.length + (its.length === 1 ? " result" : " results") + "</small></h3>"
            + '<div class="rb-gallery">' + its.map(function (i) {
              return '<a class="rb-shot" href="' + esc(i.url) + '" target="_blank" rel="noopener"><img src="' + esc(i.url) + '" alt="' + esc(name + " result " + label + (i.caption ? ": " + i.caption.slice(0, 80) : "")) + '" loading="lazy" decoding="async">'
                + "<span>" + esc((i.caption || "").slice(0, 120)) + "</span></a>";
            }).join("") + "</div></div>";
        }).join("");
      })
      .catch(function () { /* keep what the page was built with */ });
  });
  document.querySelectorAll(".rb-gallery[data-market]").forEach(function (box) {
    var market = box.getAttribute("data-market") || "", limit = box.getAttribute("data-limit") || "24", review = market === "review";
    fetch(API + "/api/robot/results?limit=" + limit + (market ? "&market=" + encodeURIComponent(market) : ""), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var items = (d && d.items) || [];
        if (!items.length) return;
        box.innerHTML = items.map(function (i) { return card(i, review); }).join("");
        var sec = box.closest("section"); if (sec) sec.hidden = false;
      })
      .catch(function () { /* keep what the page was built with */ });
  });
})();
