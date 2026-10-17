/* Small helpers for every website page. */
(function () {
  "use strict";
  var header = document.querySelector(".site-header");
  var btn = document.querySelector(".menu-btn");
  if (header && btn) {
    btn.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("open")) { header.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    });
  }
  // Dark / light mode (saved in this browser, shared with the web app)
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("alice-theme", next); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "light" ? "#F3F5F9" : "#0A0E17");
    });
  });
  if (document.documentElement.getAttribute("data-theme") === "light") {
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", "#F3F5F9");
  }
  // Telegram buttons: × makes them smaller (remembered for 3 days)
  var dock = document.getElementById("tg-dock");
  if (dock) {
    try { if (Date.now() - Number(localStorage.getItem("tgDockMin") || 0) < 3 * 864e5) dock.classList.add("min"); } catch (e) {}
    var x = dock.querySelector("[data-dock-min]");
    if (x) x.addEventListener("click", function () { dock.classList.add("min"); try { localStorage.setItem("tgDockMin", String(Date.now())); } catch (e) {} });
  }
  // Offline support + "install as app" (Android Chrome, desktop) — the service worker never caches the server's live data.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register((window.ALICE && window.ALICE.base || "/") + "sw.js").catch(function () {});
    });
  }
})();
