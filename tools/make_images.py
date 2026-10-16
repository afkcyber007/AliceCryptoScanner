"""Draws the article images (run on a developer PC, the results are committed in static/img/articles/).

  python tools/make_images.py [path/to/course/img]

- edu/   : the Trading Academy diagrams, converted to WebP
- art/   : extra educational diagrams for the guides (matplotlib)
- cover/ : a 1600x900 cover for every article in content/articles (Pillow)
Needs: pip install matplotlib pillow numpy
"""
from __future__ import annotations

import hashlib
import math
import random
import re
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter, ImageFont  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "img" / "articles"
BG, GRID, TXT, GOLD = "#0E1116", "#1E242C", "#C9D1D9", "#F5B941"
BULL, BEAR, BLUE, VIOLET = "#26A69A", "#EF5350", "#5BB4F5", "#A898FF"


# --------------------------------------------------------------------------- matplotlib helpers
def ohlc_from(path: np.ndarray, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    o = np.r_[path[0], path[:-1]]
    c = path
    span = np.maximum(np.abs(c - o), np.abs(np.diff(np.r_[path[0], path])).mean() * 0.6)
    h = np.maximum(o, c) + rng.random(len(c)) * span * 0.4 + 0.01
    l = np.minimum(o, c) - rng.random(len(c)) * span * 0.4 - 0.01
    return np.column_stack([o, h, l, c])


def walk(points, n, noise=0.12, seed=3):
    xs, ys = zip(*points)
    base = np.interp(np.arange(n), xs, ys)
    rng = np.random.default_rng(seed)
    return base + rng.normal(0, noise, n).cumsum() * 0.12 + rng.normal(0, noise, n) * 0.5


def setup(ax, title=None):
    ax.set_facecolor(BG)
    for s in ax.spines.values():
        s.set_color(GRID)
    ax.tick_params(colors=TXT, labelsize=7)
    ax.grid(color=GRID, linewidth=0.6)
    ax.set_xticks([])
    if title:
        ax.set_title(title, color=GOLD, fontsize=11, fontweight="bold", loc="left")


def candles(ax, ohlc, x0=0):
    for i, (o, h, l, c) in enumerate(ohlc):
        col = BULL if c >= o else BEAR
        ax.plot([x0 + i, x0 + i], [l, h], color=col, linewidth=0.9)
        ax.add_patch(Rectangle((x0 + i - 0.32, min(o, c)), 0.64, max(abs(c - o), 0.015), color=col))
    ax.set_xlim(x0 - 1, x0 + len(ohlc))


def ema(x, n):
    k, out, e = 2 / (n + 1), [], x[0]
    for v in x:
        e = v * k + e * (1 - k)
        out.append(e)
    return np.array(out)


def save(fig, name):
    p = OUT / "art" / name
    p.parent.mkdir(parents=True, exist_ok=True)
    fig.patch.set_facecolor(BG)
    fig.tight_layout()
    tmp = p.with_suffix(".png")
    fig.savefig(tmp, dpi=170, facecolor=BG)
    plt.close(fig)
    Image.open(tmp).convert("RGB").save(p, quality=86, method=6)
    tmp.unlink()


def label(ax, x, y, t, c=GOLD, s=8.5, **kw):
    ax.annotate(t, (x, y), color=c, fontsize=s, fontweight="bold", ha="center", **kw)


# --------------------------------------------------------------------------- new diagrams
def ma_crossover():
    p = walk([(0, 12), (25, 10.5), (40, 11), (70, 14.5), (90, 16)], 91, 0.1, 11)
    fig, ax = plt.subplots(figsize=(7.4, 3.8))
    setup(ax, "EMA 21, 50 and 200: trend alignment and golden cross")
    candles(ax, ohlc_from(p, 11))
    ax.plot(ema(p, 21), color=GOLD, lw=1.6, label="EMA 21")
    ax.plot(ema(p, 50), color=BLUE, lw=1.6, label="EMA 50")
    ax.plot(ema(np.r_[np.full(120, 12.6), p], 200)[120:], color=VIOLET, lw=1.6, label="EMA 200")
    ax.legend(facecolor=BG, edgecolor=GRID, labelcolor=TXT, fontsize=7, loc="upper left")
    label(ax, 47, 10.2, "Golden cross: 21 crosses above 50", c=BULL, s=8)
    label(ax, 76, 13.0, "Pullback to the 21 EMA = entry", c=GOLD, s=8)
    save(fig, "ma_crossover.webp")


def macd():
    p = walk([(0, 10), (20, 12.5), (35, 11.2), (55, 14), (70, 13.6), (90, 11.5)], 91, 0.1, 5)
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(7.4, 4.6), gridspec_kw={"height_ratios": [2.2, 1]}, sharex=True)
    setup(a1, "MACD (12, 26, 9): momentum under the price")
    candles(a1, ohlc_from(p, 5))
    m = ema(p, 12) - ema(p, 26)
    s = ema(m, 9)
    setup(a2)
    a2.bar(range(len(p)), m - s, color=[BULL if v >= 0 else BEAR for v in m - s], width=0.7)
    a2.plot(m, color=GOLD, lw=1.4, label="MACD")
    a2.plot(s, color=BLUE, lw=1.4, label="Signal")
    a2.axhline(0, color=TXT, lw=0.6, alpha=.5)
    a2.legend(facecolor=BG, edgecolor=GRID, labelcolor=TXT, fontsize=7, loc="lower left")
    h = m - s
    ups = [i for i in range(1, len(h)) if h[i - 1] < 0 <= h[i]]
    dns = [i for i in range(1, len(h)) if h[i - 1] >= 0 > h[i]]
    for i in ups[:2]:
        a2.annotate("buy", (i, m[i]), xytext=(i, m[i] - 0.25), color=BULL, fontsize=7.5, fontweight="bold", ha="center",
                    arrowprops={"arrowstyle": "->", "color": BULL})
    for i in dns[:2]:
        a2.annotate("sell", (i, m[i]), xytext=(i, m[i] + 0.25), color=BEAR, fontsize=7.5, fontweight="bold", ha="center",
                    arrowprops={"arrowstyle": "->", "color": BEAR})
    save(fig, "macd.webp")


def bollinger():
    p = walk([(0, 12), (15, 12.8), (25, 12.2), (55, 12.4), (65, 14.5), (90, 16)], 91, 0.05, 8)
    p[20:58] = 12.35 + (p[20:58] - 12.35) * 0.25
    fig, ax = plt.subplots(figsize=(7.4, 3.8))
    setup(ax, "Bollinger Bands (20, 2): squeeze, then breakout")
    candles(ax, ohlc_from(p, 8))
    mid = np.array([p[max(0, i - 19):i + 1].mean() for i in range(len(p))])
    sd = np.array([p[max(0, i - 19):i + 1].std() for i in range(len(p))])
    ax.plot(mid, color=GOLD, lw=1.2)
    ax.plot(mid + 2 * sd, color=BLUE, lw=1.2)
    ax.plot(mid - 2 * sd, color=BLUE, lw=1.2)
    ax.fill_between(range(len(p)), mid - 2 * sd, mid + 2 * sd, color=BLUE, alpha=.07)
    label(ax, 40, 11.3, "Squeeze: bands at their narrowest", c=GOLD, s=8)
    label(ax, 74, 16.2, "Breakout with expanding bands", c=BULL, s=8)
    save(fig, "bollinger.webp")


def trading_styles():
    fig, ax = plt.subplots(figsize=(7.4, 3.3))
    setup(ax, "Trading styles by holding time")
    ax.set_yticks([])
    styles = [("Scalping", "1M–5M · seconds to minutes", 0, 1.2, BEAR), ("Day trading", "5M–1H · minutes to hours", 1.0, 2.6, GOLD),
              ("Swing trading", "1H–1D · days to weeks", 2.4, 4.0, BULL), ("Position trading", "1D–1W · weeks to months", 3.8, 5.0, BLUE)]
    for i, (n, d, a, b, c) in enumerate(styles):
        y = 3 - i
        ax.add_patch(Rectangle((a, y - .32), b - a, .64, color=c, alpha=.85))
        ax.text(a + .08, y + .02, n, color="#0B0F16", fontsize=9, fontweight="bold", va="center")
        ax.text(b + .08, y, d, color=TXT, fontsize=8, va="center")
    ax.set_xlim(0, 7.2)
    ax.set_ylim(-.7, 3.7)
    ax.set_xticks([0.3, 1.5, 3, 4.5])
    ax.set_xticklabels(["minutes", "hours", "days", "weeks"], color=TXT)
    save(fig, "trading_styles.webp")


def forex_quote():
    fig, ax = plt.subplots(figsize=(7.4, 3.2))
    ax.set_facecolor(BG)
    ax.axis("off")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.text(0.3, 4.4, "Reading a forex quote", color=GOLD, fontsize=12, fontweight="bold")
    ax.text(1.0, 2.9, "EUR", color=GOLD, fontsize=30, fontweight="bold")
    ax.text(2.55, 2.9, "/", color=TXT, fontsize=30)
    ax.text(3.0, 2.9, "USD", color=BLUE, fontsize=30, fontweight="bold")
    ax.text(1.05, 2.3, "Base currency", color=GOLD, fontsize=8)
    ax.text(3.05, 2.3, "Quote currency", color=BLUE, fontsize=8)
    for x, t, v, c in ((5.5, "BID (sell)", "1.0848", BEAR), (7.7, "ASK (buy)", "1.0850", BULL)):
        ax.add_patch(Rectangle((x, 2.2), 1.9, 1.6, color=c, alpha=.18))
        ax.text(x + .95, 3.4, t, color=c, fontsize=9, fontweight="bold", ha="center")
        ax.text(x + .95, 2.6, v, color="#FFFFFF", fontsize=17, fontweight="bold", ha="center")
    ax.text(7.5, 1.6, "Spread = 0.0002 = 2 pips", color=TXT, fontsize=9, ha="center")
    ax.text(0.3, 0.6, "Buy EUR/USD = buy euros, sell dollars.  1 pip = 0.0001 ≈ $10 per standard lot (100,000).",
            color=TXT, fontsize=8.5)
    save(fig, "forex_quote.webp")


def stop_loss():
    p = walk([(0, 14), (18, 11.5), (28, 12.8), (40, 11.2), (52, 13), (75, 15.5)], 76, 0.08, 21)
    fig, ax = plt.subplots(figsize=(7.4, 3.8))
    setup(ax, "Stop loss: below structure plus an ATR buffer")
    candles(ax, ohlc_from(p, 21))
    low = min(p[35:46]) - 0.1
    ax.axhline(low, color=BEAR, lw=1.1, ls=":")
    ax.axhline(low - 0.55, color=BULL, lw=1.4, ls="--")
    label(ax, 14, low + 0.1, "Stop right at the low: swept by noise", c=BEAR, s=8)
    label(ax, 14, low - 0.45, "Stop below the low + 1 ATR: survives", c=BULL, s=8)
    label(ax, 47, low - 1.0, "Entry after the higher low", c=GOLD, s=8)
    save(fig, "stop_loss.webp")


# --------------------------------------------------------------------------- covers (Pillow)
FONT_DIR = Path("/usr/share/fonts/opentype/inter")
CAT_COLORS = {"forex": (59, 167, 255), "crypto": (124, 92, 255), "gold": (245, 185, 65), "strategy": (22, 199, 132), "basics": (236, 115, 80)}
CAT_NAMES = {"forex": "FOREX", "crypto": "CRYPTO", "gold": "GOLD", "strategy": "STRATEGY", "basics": "TRADING BASICS"}


def font(weight, size):
    name = {"b": "Inter-Bold.otf", "x": "Inter-ExtraBold.otf", "s": "Inter-SemiBold.otf", "m": "Inter-Medium.otf"}[weight]
    return ImageFont.truetype(str(FONT_DIR / name), size)


def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def cover(slug, title, category):
    W, H = 1600, 900
    seed = int(hashlib.md5(slug.encode()).hexdigest()[:8], 16)
    rnd = random.Random(seed)
    acc = CAT_COLORS.get(category, (245, 185, 65))
    img = Image.new("RGB", (W, H), (9, 12, 20))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((900, -200, 1900, 800), fill=tuple(int(c * .55) for c in acc))
    g.ellipse((-300, 500, 700, 1300), fill=(30, 40, 70))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(180)), .6)
    d = ImageDraw.Draw(img)
    # chart on the right
    x0, y0, x1, y1 = 860, 170, 1540, 760
    for i in range(7):
        y = y0 + (y1 - y0) * i / 6
        d.line((x0, y, x1, y), fill=(32, 40, 58), width=2)
    n, p, data = 46, 100.0, []
    trend = rnd.choice([1, 1, -1, 0.3])
    for i in range(n):
        o = p
        c = o + rnd.gauss(0.35 * trend + math.sin(i / rnd.uniform(4, 7)) * .6, 1.3)
        data.append((o, max(o, c) + abs(rnd.gauss(0, .7)), min(o, c) - abs(rnd.gauss(0, .7)), c))
        p = c
    lo, hi = min(c[2] for c in data), max(c[1] for c in data)
    sy = lambda v: y1 - (v - lo) / (hi - lo) * (y1 - y0)
    cw = (x1 - x0) / n
    for i, (o, h, l, c) in enumerate(data):
        x = x0 + cw * (i + .5)
        col = (38, 166, 154) if c >= o else (239, 83, 80)
        d.line((x, sy(h), x, sy(l)), fill=col, width=3)
        d.rectangle((x - cw * .32, sy(max(o, c)), x + cw * .32, sy(min(o, c)) + 2), fill=col)
    k, e, pts = 2 / 11, data[0][3], []
    for i, c in enumerate(data):
        e = c[3] * k + e * (1 - k)
        pts.append((x0 + cw * (i + .5), sy(e)))
    d.line(pts, fill=acc, width=5, joint="curve")
    # text block
    d.rounded_rectangle((80, 90, 80 + d.textlength(CAT_NAMES.get(category, "GUIDE"), font=font("b", 26)) + 44, 140), 25, fill=acc)
    d.text((102, 98), CAT_NAMES.get(category, "GUIDE"), font=font("b", 26), fill=(10, 12, 18))
    size = 66
    while True:
        f = font("x", size)
        lines = wrap(d, title, f, 700)
        if len(lines) <= 5 or size <= 44:
            break
        size -= 4
    y = 190
    for ln in lines[:6]:
        d.text((80, y), ln, font=f, fill=(240, 243, 248))
        y += int(size * 1.18)
    d.line((80, 800, 160, 800), fill=acc, width=5)
    d.text((80, 818), "Alice Forex/Crypto Scanner · Free guide", font=font("s", 28), fill=(170, 180, 198))
    dest = OUT / "cover" / f"{slug}.webp"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, quality=82, method=6)


def front(text):
    meta = {}
    if text.startswith("---"):
        end = text.find("\n---", 3)
        for line in text[3:end].strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
    return meta


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if src and src.is_dir():
        (OUT / "edu").mkdir(parents=True, exist_ok=True)
        for p in sorted(src.glob("*.png")):
            Image.open(p).convert("RGB").save(OUT / "edu" / (p.stem + ".webp"), quality=88, method=6)
    for fn in (ma_crossover, macd, bollinger, trading_styles, forex_quote, stop_loss):
        fn()
    for p in sorted((ROOT / "content" / "articles").glob("*.md")):
        m = front(p.read_text(encoding="utf-8"))
        cover(p.stem, re.sub(r"\s+", " ", m.get("h1") or m.get("title", p.stem)), m.get("category", "basics").lower())
    print("images written to", OUT)


if __name__ == "__main__":
    main()
