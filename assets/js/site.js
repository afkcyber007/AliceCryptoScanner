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
  // Offline support + "install as app" (Android Chrome, desktop) — the service worker never caches the server's live data.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register((window.ALICE && window.ALICE.base || "/") + "sw.js").catch(function () {});
    });
  }
})();
