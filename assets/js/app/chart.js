/* Small candlestick chart on <canvas>: candles, volume, EMAs, support/resistance zones, Fibonacci and a crosshair. */
import { price as fmtPrice } from "./core.js";

function ema(values, n) {
  const k = 2 / (n + 1); const out = []; let prev = null;
  values.forEach((v, i) => {
    if (i < n - 1) { out.push(null); return; }
    if (prev == null) { prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n; out.push(prev); return; }
    prev = v * k + prev * (1 - k); out.push(prev);
  });
  return out;
}

export function drawChart(wrap, candles, opts = {}) {
  if (!wrap || !candles || !candles.length) return () => {};
  const { market, symbol, zones, fib, emas = [21, 50, 200] } = opts;
  wrap.innerHTML = '<canvas aria-hidden="true"></canvas><div class="chart-tip"></div>';
  const cv = wrap.querySelector("canvas"), tip = wrap.querySelector(".chart-tip");
  const ctx = cv.getContext("2d");
  const closes = candles.map((c) => c[4]);
  const emaLines = emas.map((n, i) => ({ n, v: ema(closes, n), color: ["#F5B941", "#3BA7FF", "#A898FF"][i] }));
  let hover = -1;

  const fmtTime = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const paint = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const padR = 68, padT = 26, volH = Math.round(H * 0.16), padB = 22;
    const plotW = W - padR, plotH = H - padT - padB - volH;
    // how many candles fit
    const maxBars = Math.max(30, Math.floor(plotW / 6));
    const data = candles.slice(-maxBars);
    const off = candles.length - data.length;
    let lo = Infinity, hi = -Infinity;
    data.forEach((c) => { lo = Math.min(lo, c[3]); hi = Math.max(hi, c[2]); });
    const pad = (hi - lo) * 0.08 || hi * 0.01; lo -= pad; hi += pad;
    const y = (p) => padT + (hi - p) / (hi - lo) * plotH;
    const bw = plotW / data.length;
    const x = (i) => i * bw + bw / 2;
    // grid + axis labels
    ctx.font = "11px 'IBM Plex Sans', system-ui, sans-serif"; ctx.textBaseline = "middle";
    for (let g = 0; g <= 4; g++) {
      const p = lo + (hi - lo) * g / 4, yy = y(p);
      ctx.strokeStyle = "rgba(42,52,71,.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke();
      ctx.fillStyle = "#5F6B80"; ctx.fillText(fmtPrice(p, market, symbol), plotW + 6, yy);
    }
    // zones
    const band = (low, high, color) => {
      const a = y(Math.max(low, high)), b = y(Math.min(low, high)), h = Math.max(2, b - a);
      if (b < padT || a > padT + plotH) return;
      ctx.fillStyle = color; ctx.fillRect(0, a - (h < 3 ? 1 : 0), plotW, h);
    };
    if (zones) {
      (zones.supports || []).slice(0, 3).forEach((z) => band(z.low || z.price, z.high || z.price, "rgba(22,199,132,.16)"));
      (zones.resistances || []).slice(0, 3).forEach((z) => band(z.low || z.price, z.high || z.price, "rgba(234,57,67,.16)"));
    }
    if (fib && fib.levels) {
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      fib.levels.filter((l) => l.kind !== "extension").forEach((l) => {
        const yy = y(l.price); if (yy < padT || yy > padT + plotH) return;
        ctx.strokeStyle = l.ratio >= 0.5 && l.ratio <= 0.65 ? "rgba(245,185,65,.7)" : "rgba(141,151,170,.35)";
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke();
        ctx.fillStyle = "#8D97AA"; ctx.fillText(l.label, 4, yy - 7);
      });
      ctx.setLineDash([]);
    }
    // volume
    let vmax = 0; data.forEach((c) => (vmax = Math.max(vmax, c[5] || 0)));
    if (vmax > 0) data.forEach((c, i) => {
      const h = (c[5] || 0) / vmax * (volH - 4);
      ctx.fillStyle = c[4] >= c[1] ? "rgba(22,199,132,.28)" : "rgba(234,57,67,.28)";
      ctx.fillRect(x(i) - Math.max(1, bw * 0.35), H - padB - h, Math.max(1, bw * 0.7), h);
    });
    // candles
    data.forEach((c, i) => {
      const up = c[4] >= c[1], col = up ? "#16C784" : "#EA3943";
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x(i), y(c[2])); ctx.lineTo(x(i), y(c[3])); ctx.stroke();
      const top = y(Math.max(c[1], c[4])), bot = y(Math.min(c[1], c[4]));
      ctx.fillRect(x(i) - Math.max(0.5, bw * 0.35), top, Math.max(1, bw * 0.7), Math.max(1, bot - top));
    });
    // EMAs
    emaLines.forEach((l) => {
      ctx.strokeStyle = l.color; ctx.lineWidth = 1.4; ctx.beginPath(); let started = false;
      data.forEach((c, i) => { const v = l.v[off + i]; if (v == null) return; const yy = y(v); if (!started) { ctx.moveTo(x(i), yy); started = true; } else ctx.lineTo(x(i), yy); });
      ctx.stroke();
    });
    // last price
    const last = data[data.length - 1], ly = y(last[4]);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(233,237,245,.5)"; ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(plotW, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = last[4] >= last[1] ? "#16C784" : "#EA3943"; ctx.fillRect(plotW, ly - 10, padR, 20);
    ctx.fillStyle = "#04120C"; ctx.font = "600 11px 'IBM Plex Sans', system-ui, sans-serif"; ctx.fillText(fmtPrice(last[4], market, symbol), plotW + 5, ly);
    // time labels
    ctx.fillStyle = "#5F6B80"; ctx.font = "11px 'IBM Plex Sans', system-ui, sans-serif";
    { // time axis: as many labels as fit without overlapping
      const span = data.length > 1 ? data[data.length - 1][0] - data[0][0] : 0;
      const daily = span / Math.max(1, data.length - 1) >= 864e5 * 0.9;
      const lab = (t) => { const d = new Date(t); return daily ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }); };
      const wLab = ctx.measureText(lab(data[0][0])).width + 18;
      const n = Math.max(2, Math.min(6, Math.floor(plotW / wLab)));
      for (let k = 0; k < n; k++) { const i = Math.round((data.length - 1) * (k + 0.5) / n); const txt = lab(data[i][0]); const tw = ctx.measureText(txt).width; ctx.fillText(txt, Math.min(plotW - tw, Math.max(0, x(i) - tw / 2)), H - 9); }
    }
    // crosshair
    const hi2 = hover >= 0 ? Math.min(data.length - 1, hover) : data.length - 1;
    const c = data[hi2];
    if (hover >= 0) {
      ctx.strokeStyle = "rgba(233,237,245,.35)"; ctx.beginPath(); ctx.moveTo(x(hi2), padT); ctx.lineTo(x(hi2), H - padB); ctx.stroke();
    }
    tip.textContent = `${fmtTime(c[0])}  O ${fmtPrice(c[1], market, symbol)}  H ${fmtPrice(c[2], market, symbol)}  L ${fmtPrice(c[3], market, symbol)}  C ${fmtPrice(c[4], market, symbol)}`;
    paint.bw = bw; paint.count = data.length;
  };
  const move = (clientX) => {
    const r = cv.getBoundingClientRect(); const xx = clientX - r.left;
    hover = xx > r.width - 68 ? -1 : Math.max(0, Math.floor(xx / (paint.bw || 1)));
    paint();
  };
  cv.addEventListener("mousemove", (e) => move(e.clientX));
  cv.addEventListener("mouseleave", () => { hover = -1; paint(); });
  cv.addEventListener("touchmove", (e) => { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
  cv.addEventListener("touchend", () => { hover = -1; paint(); });
  const ro = new ResizeObserver(() => paint());
  ro.observe(wrap);
  paint();
  return () => ro.disconnect();
}
export const EMA_COLORS = { 21: "#F5B941", 50: "#3BA7FF", 200: "#A898FF" };
