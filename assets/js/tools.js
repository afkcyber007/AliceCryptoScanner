/* Free calculators. Everything runs in the browser; live prices come from the Alice server when it's reachable. */
(function () {
  "use strict";
  var A = window.ALICE || {};
  var box = document.querySelector("[data-tool]");
  if (!box) return;
  var tool = box.getAttribute("data-tool");

  /* ---------------------------------------------------------------- helpers */
  function $(sel) { return box.querySelector(sel); }
  function val(name) { var el = box.querySelector('[name="' + name + '"]'); return el ? el.value : ""; }
  function num(name) { var v = parseFloat(String(val(name)).replace(",", ".")); return isFinite(v) ? v : NaN; }
  function out(key, text, cls) {
    box.querySelectorAll('[data-out="' + key + '"]').forEach(function (el) {
      el.textContent = text; if (cls !== undefined) el.className = cls;
    });
  }
  function outHtml(key, html) { var el = document.querySelector('[data-out="' + key + '"]'); if (el) el.innerHTML = html; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(v, d) {
    if (!isFinite(v)) return "--";
    if (d == null) d = Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? 2 : Math.abs(v) >= 0.01 ? 4 : 6;
    return Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function money(v, ccy) {
    if (!isFinite(v)) return "--";
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD", maximumFractionDigits: ccy === "JPY" ? 0 : 2 }).format(v); }
    catch (e) { return fmt(v, 2) + " " + (ccy || ""); }
  }
  function priceDigits(p) { p = Math.abs(p); return p >= 1000 ? 2 : p >= 10 ? 3 : p >= 1 ? 5 : p >= 0.01 ? 6 : 8; }
  function seg(name) {
    var g = box.querySelector('[data-name="' + name + '"]');
    if (!g) return "";
    var on = g.querySelector('[aria-pressed="true"]');
    return on ? on.getAttribute("data-v") : "";
  }
  function bindSeg(cb) {
    box.querySelectorAll(".seg[data-name]").forEach(function (g) {
      g.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          g.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          cb();
        });
      });
    });
  }
  function onInput(cb) {
    box.addEventListener("input", cb); box.addEventListener("change", cb); bindSeg(cb);
  }
  function showMode(mode) {
    document.querySelectorAll("[data-show]").forEach(function (el) { el.hidden = el.getAttribute("data-show") !== mode; });
  }
  function get(path) {
    return fetch((A.api || "") + path, { headers: { Accept: "application/json" } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  /* live FX rates: symbol -> price */
  var RATES = {};
  var ratesReady = get("/api/fx/rates").then(function (d) { RATES = d.rates || {}; return RATES; }).catch(function () { return RATES; });
  function rate(base, quote) {
    if (base === quote) return 1;
    var d = RATES[base + quote]; if (d) return d;
    var i = RATES[quote + base]; if (i) return 1 / i;
    var bu = base === "USD" ? 1 : RATES[base + "USD"] || (RATES["USD" + base] ? 1 / RATES["USD" + base] : 0);
    var qu = quote === "USD" ? 1 : RATES[quote + "USD"] || (RATES["USD" + quote] ? 1 / RATES["USD" + quote] : 0);
    return bu && qu ? bu / qu : NaN;
  }
  function spec(sym) {
    if (sym === "XAUUSD") return { base: "XAU", quote: "USD", pip: 0.1, contract: 100, unit: "oz" };
    if (sym === "XAGUSD") return { base: "XAG", quote: "USD", pip: 0.01, contract: 5000, unit: "oz" };
    if (sym === "BTCUSD" || sym === "ETHUSD") return { base: sym.slice(0, 3), quote: "USD", pip: 1, contract: 1, unit: sym.slice(0, 3) };
    var q = sym.slice(3);
    return { base: sym.slice(0, 3), quote: q, pip: q === "JPY" ? 0.01 : 0.0001, contract: 100000, unit: "units" };
  }
  function livePrice(sym) {
    if (RATES[sym]) return RATES[sym];
    if (sym === "BTCUSD") return RATES.BTCUSDT; if (sym === "ETHUSD") return RATES.ETHUSDT;
    return NaN;
  }
  /* fill the price box with the live price when the pair changes (unless the user typed their own) */
  function autoPrice(pairName, priceName, after) {
    var pairEl = box.querySelector('[name="' + pairName + '"]'), priceEl = box.querySelector('[name="' + priceName + '"]');
    if (!pairEl || !priceEl) return;
    var fill = function () {
      var p = livePrice(pairEl.value);
      if (isFinite(p)) { priceEl.value = Number(p.toFixed(priceDigits(p))); priceEl.dataset.auto = "1"; }
      else if (priceEl.dataset.auto) { priceEl.value = ""; }
      after();
    };
    pairEl.addEventListener("change", fill);
    priceEl.addEventListener("input", function () { delete priceEl.dataset.auto; });
    ratesReady.then(fill);
  }
  /* convert an amount in the instrument's quote currency to the account currency, using the instrument price if needed */
  function toAccount(amountQuote, s, acc, price) {
    if (s.quote === acc) return amountQuote;
    if (s.base === acc && price) return amountQuote / price;      // e.g. USDJPY with a USD account
    var r = rate(s.quote, acc);
    return isFinite(r) ? amountQuote * r : NaN;
  }

  /* ---------------------------------------------------------------- calculators */
  var calc = {};

  calc.position = function () {
    var mode = seg("mode"); showMode(mode);
    var bal = num("bal"), riskPct = num("risk"), riskAmt = bal * riskPct / 100;
    if (mode === "fx") {
      var acc = val("acc"), sym = val("pair"), s = spec(sym), price = num("price"), sl = num("sl");
      out("riskAmt", money(riskAmt, acc));
      var note = box.querySelector("[data-pipnote]");
      if (note) note.textContent = sym.indexOf("XAU") === 0 ? "1 pip = $0.10 move, 1 lot = 100 oz" : sym.indexOf("XAG") === 0 ? "1 pip = $0.01 move, 1 lot = 5,000 oz" : "1 pip = " + s.pip;
      var pipPerLot = toAccount(s.contract * s.pip, s, acc, price);
      var lots = riskAmt / (sl * pipPerLot);
      out("sizeLabel", "Standard lots");
      out("size", isFinite(lots) && sl > 0 ? fmt(lots, 2) : "--");
      out("mini", isFinite(lots) && sl > 0 ? fmt(lots * 10, 1) : "--");
      out("units", isFinite(lots) && sl > 0 ? fmt(lots * s.contract, 0) + (s.unit === "oz" ? " oz" : "") : "--");
      out("pipv", isFinite(lots) && sl > 0 ? money(lots * pipPerLot, acc) : "--");
      out("note", !isFinite(pipPerLot) ? "Enter the current price to convert the pip value into " + acc + "." :
        "Most brokers allow steps of 0.01 lots, so round down to " + fmt(Math.floor(lots * 100) / 100, 2) + " lots.");
    } else {
      var entry = num("entry"), stop = num("stop"), lev = Math.max(1, num("lev") || 1);
      var dist = Math.abs(entry - stop), qty = riskAmt / dist;
      out("riskAmt", money(riskAmt, "USD"));
      out("sizeLabel", "Quantity to buy or sell");
      out("size", isFinite(qty) && dist > 0 ? fmt(qty, qty >= 100 ? 2 : qty >= 1 ? 4 : 6) : "--");
      out("notional", isFinite(qty) && dist > 0 ? money(qty * entry, "USD") : "--");
      out("margin", isFinite(qty) && dist > 0 ? money(qty * entry / lev, "USD") : "--");
      var stopPct = dist / entry * 100;
      out("note", dist > 0 ? "Your stop is " + fmt(stopPct, 2) + "% away from entry." + (qty * entry / lev > bal ? " This position needs more margin than your balance; lower the risk or widen leverage carefully." : "") : "Entry and stop loss must be different.", "tool-hint" + (qty * entry / lev > bal ? " warn" : ""));
    }
  };

  calc.pip = function () {
    var acc = val("acc"), sym = val("pair"), s = spec(sym), price = num("price"), lots = num("lots");
    var perLot = toAccount(s.contract * s.pip, s, acc, price);
    out("pip", money(perLot * lots, acc));
    out("std", money(perLot, acc)); out("mini", money(perLot / 10, acc)); out("micro", money(perLot / 100, acc));
    out("size", String(s.pip) + (s.unit === "oz" ? " (" + s.contract.toLocaleString() + " oz per lot)" : ""));
    out("note", isFinite(perLot) ? "Pip value = lot size × contract size × pip size, converted from " + s.quote + " to " + acc + "." : "Enter the current price to calculate.");
  };

  calc.rr = function () {
    var long = seg("side") === "long", e = num("entry"), sl = num("sl"), tp = num("tp"), risk = num("risk");
    var r = long ? e - sl : sl - e, w = long ? tp - e : e - tp;
    var ok = r > 0 && w > 0;
    var ratio = w / r;
    out("ratio", ok ? "1 : " + fmt(ratio, 2) : "--");
    out("riskd", r > 0 ? fmt(r, priceDigits(e)) + " (" + fmt(r / e * 100, 2) + "%)" : "--");
    out("rewd", w > 0 ? fmt(w, priceDigits(e)) + " (" + fmt(w / e * 100, 2) + "%)" : "--");
    out("profit", ok && risk > 0 ? money(risk * ratio, "USD") : "--");
    out("be", ok ? fmt(100 / (1 + ratio), 1) + "%" : "--");
    out("note", !ok ? (long ? "For a long trade the stop goes below entry and the target above it." : "For a short trade the stop goes above entry and the target below it.") :
      ratio < 1 ? "You risk more than you can make, so you need to win more than half your trades to profit." :
      "You only need to win " + fmt(100 / (1 + ratio), 0) + "% of trades like this to break even.", "tool-hint" + (ok && ratio < 1 ? " warn" : ""));
  };

  calc.fib = function () {
    var up = seg("dir") === "up", h = num("high"), l = num("low"), p = num("price");
    if (!(h > l)) { outHtml("table", '<tr><td colspan="2" class="warn">The swing high must be above the swing low.</td></tr>'); return; }
    var R = h - l, d = priceDigits(h), rows = [];
    var lv = function (ratio, kind) {
      var price = up ? (ratio <= 1 ? h - R * ratio : l + R * ratio) : (ratio <= 1 ? l + R * ratio : h - R * ratio);
      rows.push({ ratio: ratio, kind: kind, price: price });
    };
    [0, 0.236, 0.382, 0.5, 0.618, 0.65, 0.786, 1].forEach(function (r) { lv(r, "ret"); });
    [1.272, 1.414, 1.618, 2, 2.618].forEach(function (r) { lv(r, "ext"); });
    var near = null;
    if (isFinite(p)) rows.forEach(function (x) { if (near == null || Math.abs(x.price - p) < Math.abs(near.price - p)) near = x; });
    outHtml("table", rows.map(function (x) {
      var label = (x.ratio * 100).toFixed(1).replace(".0", "") + "%" + (x.kind === "ext" ? " extension" : x.ratio === 0 ? (up ? " (swing high)" : " (swing low)") : x.ratio === 1 ? (up ? " (swing low)" : " (swing high)") : "");
      var golden = x.ratio >= 0.5 && x.ratio <= 0.65 && x.kind === "ret";
      return '<tr' + (near === x ? ' style="background:rgba(245,185,65,.12)"' : "") + '><td>' + esc(label) + (golden ? ' <span class="muted">golden zone</span>' : "") + '</td><td class="num">' + fmt(x.price, d) + "</td></tr>";
    }).join(""));
    if (isFinite(p)) {
      var retr = up ? (h - p) / R : (p - l) / R;
      out("note", "Price has retraced " + fmt(retr * 100, 1) + "% of the move" + (retr >= 0.5 && retr <= 0.65 ? ", inside the 50–65% golden zone." : "."));
    } else out("note", up ? "In an uptrend, buyers often look for pullbacks to the 38.2–61.8% levels and targets at the extensions." : "In a downtrend, sellers often look for rallies into the 38.2–61.8% levels and targets at the extensions.");
  };

  calc.pivot = function () {
    var m = seg("method"), H = num("h"), L = num("l"), C = num("c"), O = num("o");
    if (!(H >= L) || !isFinite(C)) { outHtml("table", '<tr><td colspan="2">Enter yesterday\'s high, low and close.</td></tr>'); return; }
    var R = H - L, P, lv = [];
    if (m === "classic") { P = (H + L + C) / 3; lv = [["R3", H + 2 * (P - L)], ["R2", P + R], ["R1", 2 * P - L], ["Pivot", P], ["S1", 2 * P - H], ["S2", P - R], ["S3", L - 2 * (H - P)]]; }
    else if (m === "fibonacci") { P = (H + L + C) / 3; lv = [["R3", P + R], ["R2", P + 0.618 * R], ["R1", P + 0.382 * R], ["Pivot", P], ["S1", P - 0.382 * R], ["S2", P - 0.618 * R], ["S3", P - R]]; }
    else if (m === "camarilla") { var k = R * 1.1; lv = [["R4", C + k / 2], ["R3", C + k / 4], ["R2", C + k / 6], ["R1", C + k / 12], ["Close", C], ["S1", C - k / 12], ["S2", C - k / 6], ["S3", C - k / 4], ["S4", C - k / 2]]; }
    else { var c2 = isFinite(O) ? O : C; P = (H + L + 2 * c2) / 4; lv = [["R2", P + R], ["R1", 2 * P - L], ["Pivot", P], ["S1", 2 * P - H], ["S2", P - R]]; }
    var d = priceDigits(H);
    outHtml("table", lv.map(function (x) {
      var cls = x[0][0] === "R" ? "down" : x[0][0] === "S" ? "up" : "";
      return '<tr><td class="' + cls + '">' + x[0] + '</td><td class="num">' + fmt(x[1], d) + "</td></tr>";
    }).join(""));
  };

  calc.profit = function () {
    var long = seg("side") === "long", inv = num("inv"), lev = Math.max(1, num("lev") || 1), en = num("entry"), ex = num("exit"), fee = (num("fee") || 0) / 100;
    var notional = inv * lev, qty = notional / en;
    var gross = long ? qty * (ex - en) : qty * (en - ex);
    var fees = notional * fee + qty * ex * fee;
    var pnl = gross - fees;
    out("pnl", (pnl >= 0 ? "+" : "") + money(pnl, "USD"), pnl >= 0 ? "up" : "down");
    out("roi", (pnl >= 0 ? "+" : "") + fmt(pnl / inv * 100, 2) + "%");
    out("move", (ex >= en ? "+" : "") + fmt((ex - en) / en * 100, 2) + "%");
    out("qty", fmt(qty, qty >= 100 ? 2 : 6) + " coins");
    out("fees", money(fees, "USD"));
    out("final", money(inv + pnl, "USD"));
    var liq = lev > 1 ? (long ? en * (1 - 1 / lev + 0.005) : en * (1 + 1 / lev - 0.005)) : null;
    out("note", liq ? "With " + fmt(lev, 0) + "x leverage this position would be liquidated near " + fmt(liq, priceDigits(en)) + " (estimate)." : "Spot trade: you can't lose more than you invest.", liq && ((long && ex <= liq) || (!long && ex >= liq)) ? "tool-hint warn" : "tool-hint");
  };

  calc.liq = function () {
    var long = seg("side") === "long", e = num("entry"), lev = Math.max(1, num("lev")), m = num("margin"), mmr = (num("mmr") || 0) / 100;
    var liq = long ? e * (1 - 1 / lev + mmr) : e * (1 + 1 / lev - mmr);
    var notional = m * lev;
    out("liq", fmt(liq, priceDigits(e)), "down");
    out("dist", fmt(Math.abs(liq - e) / e * 100, 2) + "%");
    out("notional", money(notional, "USD"));
    out("qty", fmt(notional / e, 6));
    out("note", "Estimate for isolated margin on a USDT-margined perpetual. Exchanges add fees and use the mark price, so the real level is usually a little closer. Keep your stop loss well before it.");
  };

  calc.margin = function () {
    var acc = val("acc"), sym = val("pair"), s = spec(sym), price = num("price"), lots = num("lots"), lev = Math.max(1, num("lev"));
    var notionalBase = lots * s.contract;             // in base currency units
    var notionalQuote = notionalBase * price;           // in quote currency
    var notionalAcc = s.base === acc ? notionalBase : toAccount(notionalQuote, s, acc, price);
    out("margin", money(notionalAcc / lev, acc));
    out("notional", money(notionalAcc, acc));
    out("contract", s.contract.toLocaleString("en-US") + " " + (s.unit === "units" ? s.base : s.unit));
    out("note", isFinite(notionalAcc) ? "Margin = position value ÷ leverage. A " + fmt(lev, 0) + ":1 leverage means you put up " + fmt(100 / lev, 2) + "% of the position." : "Enter the current price to calculate.");
  };

  calc.compound = function () {
    var b = num("start"), r = num("rate") / 100, n = Math.min(600, Math.max(1, Math.round(num("n")))), add = num("add") || 0;
    if (!isFinite(b) || !isFinite(r)) return;
    var rows = [], added = 0;
    for (var i = 1; i <= n; i++) {
      var p = b * r; b = b + p + add; added += add;
      rows.push("<tr><td>" + i + '</td><td class="num ' + (p >= 0 ? "up" : "down") + '">' + money(p, "USD") + '</td><td class="num">' + money(b, "USD") + "</td></tr>");
    }
    var start = num("start");
    out("final", money(b, "USD"));
    out("profit", money(b - start - added, "USD"));
    out("added", money(added, "USD"));
    out("growth", fmt((b / (start + added) - 1) * 100, 1) + "%");
    outHtml("table", rows.join(""));
  };

  /* currency converter */
  var WORLD = null;
  var NAMES = { USD: "US dollar", EUR: "Euro", GBP: "British pound", JPY: "Japanese yen", CHF: "Swiss franc", CAD: "Canadian dollar", AUD: "Australian dollar",
    NZD: "New Zealand dollar", CNY: "Chinese yuan", HKD: "Hong Kong dollar", SGD: "Singapore dollar", INR: "Indian rupee", PKR: "Pakistani rupee",
    AED: "UAE dirham", SAR: "Saudi riyal", TRY: "Turkish lira", ZAR: "South African rand", MXN: "Mexican peso", BRL: "Brazilian real", RUB: "Russian ruble",
    KRW: "South Korean won", IDR: "Indonesian rupiah", MYR: "Malaysian ringgit", THB: "Thai baht", PHP: "Philippine peso", VND: "Vietnamese dong",
    NGN: "Nigerian naira", EGP: "Egyptian pound", BDT: "Bangladeshi taka", SEK: "Swedish krona", NOK: "Norwegian krone", DKK: "Danish krone", PLN: "Polish zloty",
    QAR: "Qatari riyal", KWD: "Kuwaiti dinar", BHD: "Bahraini dinar", OMR: "Omani rial", JOD: "Jordanian dinar", ILS: "Israeli shekel", KES: "Kenyan shilling",
    BTC: "Bitcoin", ETH: "Ethereum", USDT: "Tether", BNB: "BNB", SOL: "Solana", XRP: "XRP", DOGE: "Dogecoin", TON: "Toncoin", ADA: "Cardano", TRX: "TRON",
    XAU: "Gold (troy ounce)", XAG: "Silver (troy ounce)" };
  calc.convert = function () {
    if (!WORLD) return;
    var amt = num("amt"), f = val("from"), t = val("to"), r = WORLD.rates;
    if (!r[f] || !r[t]) return;
    var x = r[t] / r[f];
    var dd = function (v) { return Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 4 : 8; };
    out("label", fmt(amt, dd(amt)) + " " + f + " =");
    out("result", fmt(amt * x, dd(amt * x)) + " " + t);
    out("r1l", "1 " + f); out("r1", fmt(x, dd(x)) + " " + t);
    out("r2l", "1 " + t); out("r2", fmt(1 / x, dd(1 / x)) + " " + f);
    out("note", "Rates from the Alice server, updated " + new Date(WORLD.updated_at).toLocaleString() + ". Banks and exchanges add their own spread.");
  };
  function initConvert() {
    get("/api/fx/world").then(function (d) {
      WORLD = d;
      var codes = Object.keys(d.rates).sort(function (a, b) {
        var top = ["USD", "EUR", "GBP", "JPY", "PKR", "INR", "AED", "SAR", "BTC", "ETH", "USDT", "XAU"];
        var ia = top.indexOf(a), ib = top.indexOf(b);
        if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        return a.localeCompare(b);
      });
      var opts = codes.map(function (c) { return '<option value="' + c + '">' + c + (NAMES[c] ? " - " + NAMES[c] : "") + "</option>"; }).join("");
      var f = box.querySelector('[name="from"]'), t = box.querySelector('[name="to"]');
      f.innerHTML = opts; t.innerHTML = opts; f.value = "USD"; t.value = d.rates.EUR ? "EUR" : codes[1];
      calc.convert();
    }).catch(function () { out("note", "Live rates are not reachable right now. Please try again in a minute."); });
    var sw = box.querySelector("[data-swap]");
    if (sw) sw.addEventListener("click", function () {
      var f = box.querySelector('[name="from"]'), t = box.querySelector('[name="to"]'), x = f.value; f.value = t.value; t.value = x; calc.convert();
    });
  }

  /* forex market hours */
  var SESS = [
    { name: "Sydney", tz: "Australia/Sydney", open: 7, close: 16, color: "#7C8CF8" },
    { name: "Tokyo", tz: "Asia/Tokyo", open: 9, close: 18, color: "#E879B9" },
    { name: "London", tz: "Europe/London", open: 8, close: 17, color: "#5BB4F5" },
    { name: "New York", tz: "America/New_York", open: 8, close: 17, color: "#6BD49A" },
  ];
  function tzOffsetMin(tz, date) {   // minutes to add to UTC to get the time in tz
    var p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date);
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    var asUtc = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour % 24, +g.minute, +g.second);
    return Math.round((asUtc - date.getTime()) / 60000);
  }
  function hm(min) { min = ((min % 1440) + 1440) % 1440; var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
  function fxWeekendClosed(now) {
    var ny = new Date(now.getTime() + tzOffsetMin("America/New_York", now) * 60000);
    var d = ny.getUTCDay(), h = ny.getUTCHours();
    return d === 6 || (d === 5 && h >= 17) || (d === 0 && h < 17);
  }
  calc.hours = function () {
    var sel = box.querySelector('[name="tz"]'), tz = sel.value, now = new Date();
    var viewOff = tzOffsetMin(tz, now), nowMin = ((now.getUTCHours() * 60 + now.getUTCMinutes() + viewOff) % 1440 + 1440) % 1440;
    var closed = fxWeekendClosed(now), openNames = [], rows = [], bars = [];
    SESS.forEach(function (s) {
      var off = tzOffsetMin(s.tz, now);
      var o = s.open * 60 - off + viewOff, c = s.close * 60 - off + viewOff;       // minutes in the view zone
      o = ((o % 1440) + 1440) % 1440; c = ((c % 1440) + 1440) % 1440;
      var isOpen = !closed && (o < c ? nowMin >= o && nowMin < c : nowMin >= o || nowMin < c);
      if (isOpen) openNames.push(s.name);
      var seg1 = o < c ? [[o, c]] : [[o, 1440], [0, c]];
      bars.push('<div class="sess-row"><b>' + s.name + "<small>" + hm(o) + " to " + hm(c) + '</small></b><div class="sess-bar">' +
        seg1.map(function (x) { return '<i style="left:' + (x[0] / 14.4) + "%;width:" + ((x[1] - x[0]) / 14.4) + "%;background:" + s.color + (isOpen ? "" : ";opacity:.45") + '"></i>'; }).join("") +
        '<span class="sess-now" style="left:' + (nowMin / 14.4) + '%"></span></div></div>');
      rows.push("<tr><td>" + s.name + '</td><td class="num">' + hm(o) + '</td><td class="num">' + hm(c) + '</td><td><span class="open-pill ' + (isOpen ? "on" : "off") + '">' + (isOpen ? "Open" : "Closed") + "</span></td></tr>");
    });
    outHtml("bars", bars.join(""));
    outHtml("table", rows.join(""));
    out("clock", "Time now: " + hm(nowMin) + " (" + tz.replace(/_/g, " ") + ")");
    var st;
    if (closed) st = "The forex market is closed for the weekend";
    else if (openNames.length >= 2) st = openNames.join(" and ") + " overlap: usually the busiest time";
    else if (openNames.length === 1) st = openNames[0] + " session is open";
    else st = "Between sessions: quiet market";
    out("status", st);
    out("note", "Session times follow each city's local business hours and move automatically with daylight saving time. Forex trades from Sunday 17:00 to Friday 17:00 New York time.");
  };
  function initHours() {
    var sel = box.querySelector('[name="tz"]');
    var mine = "UTC";
    try { mine = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { }
    var zones = [mine, "UTC", "Europe/London", "America/New_York", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Africa/Lagos", "Europe/Berlin", "Europe/Istanbul", "America/Sao_Paulo"];
    var seen = {};
    sel.innerHTML = zones.filter(function (z) { if (seen[z]) return false; seen[z] = 1; return true; })
      .map(function (z, i) { return '<option value="' + z + '">' + (i === 0 ? "My time (" + z.replace(/_/g, " ") + ")" : z.replace(/_/g, " ")) + "</option>"; }).join("");
    setInterval(calc.hours, 30000);
  }

  /* ---------------------------------------------------------------- start */
  var run = calc[tool];
  if (!run) return;
  if (tool === "convert") initConvert();
  if (tool === "hours") initHours();
  if (tool === "pip") autoPrice("pair", "price", run);
  if (tool === "margin") autoPrice("pair", "price", run);
  if (tool === "position") autoPrice("pair", "price", run);
  onInput(run);
  run();
})();
