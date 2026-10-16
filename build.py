#!/usr/bin/env python3
"""Builds the Alice Forex/Crypto Scanner website into the _site folder.

GitHub runs this automatically on every change (see .github/workflows/deploy.yml).
To add an article: put a new .md file in content/articles (copy an existing one as a template).
Settings (server address, domain, Google Play link …) are in site.json. Ad codes are in the ads folder.

Run locally:  pip install markdown  &&  python build.py  &&  python -m http.server -d _site 8000
"""
from __future__ import annotations

import datetime as dt
import hashlib
import html
import json
import os
import re
import shutil
import sys
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

import markdown

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "_site"
TPL = ROOT / "templates"
CONTENT = ROOT / "content"

SITE = json.loads((ROOT / "site.json").read_text(encoding="utf-8"))
TODAY = dt.date.today()

# --------------------------------------------------------------------------- address of the site
def _site_address() -> tuple[str, str]:
    """(site origin without trailing slash, base path with slashes). Works for a custom domain, a
    username.github.io repo, a normal GitHub Pages project repo and local testing."""
    domain = (SITE.get("domain") or "").strip().removeprefix("https://").removeprefix("http://").strip("/")
    if domain:
        return f"https://{domain}", "/"
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if "/" in repo:
        owner, name = repo.split("/", 1)
        if name.lower() == f"{owner.lower()}.github.io":
            return f"https://{owner.lower()}.github.io", "/"
        return f"https://{owner.lower()}.github.io", f"/{name}/"
    local = os.environ.get("SITE_URL", "http://localhost:8000").rstrip("/")
    return local, os.environ.get("SITE_BASE", "/")


SITE_URL, BASE = _site_address()
API = (os.environ.get("API_URL") or SITE.get("api_url", "")).rstrip("/")


def url(path: str = "") -> str:
    """Absolute URL of a page (for canonical links, sitemap, social cards)."""
    return SITE_URL + BASE + path.lstrip("/")


# --------------------------------------------------------------------------- icons (inline SVG)
def _svg(body: str, extra: str = "") -> str:
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true"{extra}>{body}</svg>')


ICONS = {
    "check": _svg('<path d="M20 6 9 17l-5-5"/>'),
    "menu": _svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    "radar": _svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/>'),
    "trophy": _svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    "gold": _svg('<path d="M3 18h7l-1.5-5h-4zM14 18h7l-1.5-5h-4zM8.5 11h7L14 6h-4z"/>'),
    "ai": _svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>'),
    "bell": _svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
    "whale": _svg('<path d="M2 13c2 4 6 6 11 6 4 0 7-2 8-5l1-3-3 1c-1-3-4-5-8-5-5 0-8 3-9 6z"/><path d="M16 11h.01"/>'),
    "clock": _svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    "chat": _svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>'),
    "book": _svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5"/>'),
    "share": _svg('<path d="M12 3v12M7 8l5-5 5 5"/><rect x="4" y="11" width="16" height="10" rx="2"/>'),
    "plus": _svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>'),
    "download": _svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
    "android": ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#3DDC84" d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 '
                '3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 '
                '15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>'),
    "apple": ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#E9EDF5" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 '
              '0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 '
              '2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.2.7-3 1.5-.6.7-1.2 '
              '1.9-1.1 3.1 1.2.1 2.3-.6 3.1-1.4z"/></svg>'),
    "play": ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00D7FE" d="M3.6 2.2 13.4 12l-9.8 9.8a1 1 0 0 1-.6-.9V3.1c0-.4.2-.7.6-.9z"/>'
             '<path fill="#FFCE00" d="m16.8 8.6-3.4 3.4 3.4 3.4 3.8-2.2c.8-.5.8-1.7 0-2.2z"/><path fill="#FF3A44" '
             'd="M13.4 12 3.6 21.8c.3.2.8.2 1.2 0l12-6.4z"/><path fill="#00F076" d="M4.8 2.2c-.4-.2-.9-.2-1.2 0L13.4 12l3.4-3.4z"/></svg>'),
    "telegram": _svg('<path d="m22 3-20 8 7 2.5M22 3l-4 18-9-7.5M22 3 9 13.5v6l3.5-4"/>'),
    "globe": _svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    "lock": _svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
}

# --------------------------------------------------------------------------- tools
TOOLS = [
    # slug, short name, one-line description, emoji, widget
    ("position-size-calculator", "Position size calculator", "Lots and units from your risk and stop loss", "🧮", "position"),
    ("pip-value-calculator", "Pip value calculator", "What one pip is worth on any pair and lot size", "💲", "pip"),
    ("risk-reward-calculator", "Risk reward calculator", "Risk, reward, ratio and break-even win rate", "⚖️", "rr"),
    ("forex-market-hours", "Forex market hours", "Live sessions and overlaps in your time zone", "⏰", "hours"),
    ("fibonacci-calculator", "Fibonacci calculator", "Retracement and extension levels from a swing", "📐", "fib"),
    ("pivot-point-calculator", "Pivot point calculator", "Classic, Fibonacci, Camarilla and Woodie pivots", "🎯", "pivot"),
    ("crypto-profit-calculator", "Crypto profit calculator", "Profit, loss and ROI including fees", "₿", "profit"),
    ("liquidation-price-calculator", "Liquidation price calculator", "Where a leveraged futures position is liquidated", "🔥", "liq"),
    ("margin-calculator", "Margin calculator", "Margin needed for a forex, gold or crypto position", "🏦", "margin"),
    ("compound-calculator", "Compounding calculator", "Grow an account with a fixed % per trade or month", "📈", "compound"),
    ("currency-converter", "Currency converter", "160+ currencies, crypto and gold at live rates", "💱", "convert"),
]
TOOL_BY_SLUG = {t[0]: t for t in TOOLS}

CATEGORIES = {
    "basics": ("Trading basics", "cat-basics"),
    "forex": ("Forex", "cat-forex"),
    "crypto": ("Crypto", "cat-crypto"),
    "gold": ("Gold", "cat-gold"),
    "strategy": ("Strategy", "cat-strategy"),
}

# --------------------------------------------------------------------------- helpers
def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def esc(s: str) -> str:
    return html.escape(str(s), quote=True)


def render(tpl: str, ctx: dict) -> str:
    def rep(m: re.Match) -> str:
        key = m.group(1)
        if key in ctx:
            return str(ctx[key])
        if key.startswith("icon_") and key[5:] in ICONS:
            return ICONS[key[5:]]
        print(f"  ! template key not set: {key}", file=sys.stderr)
        return ""
    return re.sub(r"\{\{([a-z0-9_]+)\}\}", rep, tpl)


def front_matter(text: str) -> tuple[dict, str]:
    meta: dict = {}
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            for line in text[3:end].strip().splitlines():
                if ":" in line and not line.lstrip().startswith("#"):
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip().strip('"')
            text = text[end + 4:]
    return meta, text.lstrip("\n")


def ad(name: str, cls: str = "") -> str:
    p = ROOT / "ads" / f"{name}.html"
    code = read(p).strip() if p.exists() else ""
    if not code:
        return ""
    return f'<div class="ad {cls}">{code}</div>'


def md_to_html(text: str) -> tuple[str, list[tuple[str, str]]]:
    m = markdown.Markdown(extensions=["tables", "toc", "attr_list", "sane_lists", "md_in_html"],
                          extension_configs={"toc": {"permalink": False, "toc_depth": "2"}})
    text = text.replace("](img:", f"]({BASE}static/img/articles/")
    body = m.convert(text).replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    # images → <figure> with caption (from the markdown title), lazy loading and fixed aspect
    def fig(mm: re.Match) -> str:
        attrs = mm.group(1)
        cap = re.search(r'title="([^"]*)"', attrs)
        attrs = re.sub(r'\s*title="[^"]*"', "", attrs)
        return (f'<figure class="fig"><img{attrs} loading="lazy" decoding="async">'
                + (f"<figcaption>{cap.group(1)}</figcaption>" if cap else "") + "</figure>")
    body = re.sub(r"<p>\s*<img([^>]*?)\s*/?>\s*</p>", fig, body)
    toc = [(t["id"], t["name"]) for t in getattr(m, "toc_tokens", [])]
    return body, toc


def shortcodes(body: str) -> str:
    """[[tool:slug]] → call-out to a free tool · [[app]] → call-out to the web app."""
    def tool(m: re.Match) -> str:
        t = TOOL_BY_SLUG.get(m.group(1))
        if not t:
            return ""
        return (f'<div class="callout"><b>{t[3]} Try it: {esc(t[1])}</b><p>{esc(t[2])}. Free, no sign-up.</p>'
                f'<a class="btn btn-line btn-sm" href="{BASE}tools/{t[0]}/">Open the {esc(t[1].lower())}</a></div>')
    body = re.sub(r"<p>\[\[tool:([a-z0-9\-]+)\]\]</p>", tool, body)
    app = (f'<div class="callout"><b>See it live in Alice</b><p>The Alice scanner scores every crypto, forex, gold and index market '
           f'from 0 to 100 on every timeframe, so you can spot these setups in seconds.</p>'
           f'<a class="btn btn-gold btn-sm" href="{BASE}app/">Open the free web app</a></div>')
    return body.replace("<p>[[app]]</p>", app)


def split_faq(body_md: str) -> tuple[str, list[tuple[str, str]]]:
    """Pulls a '## Frequently asked questions' section (### question + answer) out of the markdown."""
    m = re.search(r"^## Frequently asked questions\s*$", body_md, flags=re.M)
    if not m:
        return body_md, []
    main, faq_md = body_md[:m.start()], body_md[m.end():]
    items = []
    for block in re.split(r"^### ", faq_md, flags=re.M)[1:]:
        q, _, a = block.partition("\n")
        items.append((q.strip(), a.strip()))
    return main, items


def faq_html(items: list[tuple[str, str]], open_first: bool = False) -> str:
    out = ['<div class="faq">']
    for i, (q, a) in enumerate(items):
        a_html = markdown.markdown(a)
        out.append(f'<details{" open" if open_first and i == 0 else ""}><summary>{esc(q)}</summary><div>{a_html}</div></details>')
    out.append("</div>")
    return "\n".join(out)


def faq_ld(items: list[tuple[str, str]]) -> dict:
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", markdown.markdown(a)).strip()}}
        for q, a in items]}


def ld(*objs: dict) -> str:
    graph = [o for o in objs if o]
    data = {"@context": "https://schema.org", "@graph": graph}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def crumbs_ld(items: list[tuple[str, str]]) -> dict:
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": url(p)} for i, (n, p) in enumerate(items)]}


def crumbs_html(items: list[tuple[str, str]]) -> str:
    lis = []
    for i, (n, p) in enumerate(items):
        if i == len(items) - 1:
            lis.append(f'<li aria-current="page">{esc(n)}</li>')
        else:
            lis.append(f'<li><a href="{BASE}{p}">{esc(n)}</a></li>')
    return f'<ol class="crumbs">{"".join(lis)}</ol>'


ORG = {"@type": "Organization", "@id": url("#org"), "name": "Alice Forex/Crypto Scanner", "url": url(),
       "logo": url("static/img/icons/icon-512.png"),
       "sameAs": [u for u in (SITE.get("telegram_channel"), SITE.get("twitter_url"), SITE.get("google_play_url")) if u]}


# --------------------------------------------------------------------------- page writer
VERSION = ""
SITEMAP: list[tuple[str, str, str]] = []   # (path, lastmod, priority)

# Website languages: the same 10 as the app. The home page is built once per language (/, /ur/, /hi/ …).
SITE_LANGS = [("en", "English"), ("ur", "اردو"), ("hi", "हिन्दी"), ("ar", "العربية"), ("zh", "中文"),
              ("es", "Español"), ("pt", "Português"), ("fr", "Français"), ("ru", "Русский"), ("tr", "Türkçe")]
RTL_LANGS = {"ar", "ur"}
LANG_FONTS = {"ur": "Noto+Nastaliq+Urdu:wght@400;600;700", "ar": "Noto+Sans+Arabic:wght@400;600;700",
              "hi": "Noto+Sans+Devanagari:wght@400;600;700", "zh": "Noto+Sans+SC:wght@400;600;700"}
_SITE_TR: dict[str, list[str]] = {}


def site_tr() -> dict[str, list[str]]:
    """Website translations: i18n-site/*.json, each entry "English": [ur, hi, ar, zh, es, pt, fr, ru, tr]."""
    if not _SITE_TR:
        for f in sorted((ROOT / "i18n-site").glob("*.json")):
            for en, vals in json.loads(f.read_text(encoding="utf-8")).items():
                if len(vals) != 9:
                    raise SystemExit(f"{f.name}: '{en}' needs 9 translations, has {len(vals)}")
                _SITE_TR[en] = vals
    return _SITE_TR


MISSING_TR: set[str] = set()


def localize(text: str, lang: str) -> str:
    """Replaces every [[English text]] marker with its translation (or the English text)."""
    order = ["ur", "hi", "ar", "zh", "es", "pt", "fr", "ru", "tr"]
    def rep(m: re.Match) -> str:
        en = m.group(1)
        if lang == "en":
            return en
        vals = site_tr().get(html.unescape(en))
        if not vals:
            MISSING_TR.add(en)
            return en
        return esc(vals[order.index(lang)])
    return re.sub(r"\[\[(.+?)\]\]", rep, text, flags=re.S)


def lang_home(lang: str) -> str:
    return "" if lang == "en" else f"{lang}/"


def app_url(lang: str = "en") -> str:
    return f"{BASE}app/" + ("" if lang == "en" else f"?lang={lang}")


def asset_version() -> str:
    h = hashlib.sha1()
    for folder in ("assets", "templates", "i18n", "i18n-site"):
        for p in sorted((ROOT / folder).rglob("*")):
            if p.is_file():
                h.update(p.read_bytes())
    return h.hexdigest()[:10]


def write_page(path: str, *, title: str, description: str, body: str, nav: str = "", jsonld: str = "",
               extra_js: str = "", extra_css: str = "", og_type: str = "website", robots: str = "index,follow",
               og_title: str = "", body_class: str = "", sitemap: tuple[str, str] | None = ("0.6", ""),
               ad_bottom: bool = True, lang: str = "en", alternates: str = "", og_image: str = "") -> None:
    ver = []
    if SITE.get("google_site_verification"):
        ver.append(f'<meta name="google-site-verification" content="{esc(SITE["google_site_verification"])}">')
    if SITE.get("bing_site_verification"):
        ver.append(f'<meta name="msvalidate.01" content="{esc(SITE["bing_site_verification"])}">')
    ga = SITE.get("google_analytics_id", "").strip()
    analytics = (f'<script async src="https://www.googletagmanager.com/gtag/js?id={esc(ga)}"></script>'
                 f'<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag("js",new Date());gtag("config","{esc(ga)}");</script>'
                 ) if ga else ""
    ctx = {
        "title": esc(title), "description": esc(description), "canonical": url(path), "robots": robots,
        "og_type": og_type, "og_title": esc(og_title or title), "og_image": url(og_image or "static/img/og-image.png"),
        "base": BASE, "v": VERSION, "extra_css": extra_css, "extra_js": extra_js, "verification": "\n".join(ver),
        "analytics": analytics, "ads_head": read(ROOT / "ads" / "head.html").strip(), "api": API, "site_url": SITE_URL,
        "play_url": esc(SITE.get("google_play_url", "")), "ios_url": esc(SITE.get("app_store_url", "")),
        "tg": esc(SITE.get("telegram_support", "")), "jsonld": jsonld, "body": body, "year": TODAY.year,
        "body_class": body_class, "ad_bottom": f'<div class="wrap">{ad("slot-bottom")}</div>' if ad_bottom and ad("slot-bottom") else "",
        "lang": lang, "dir": "rtl" if lang in RTL_LANGS else "ltr", "alternates": alternates, "app": app_url(lang),
        "home": BASE + lang_home(lang), "channel": esc(SITE.get("telegram_channel", "")),
        "lang_font": (f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={LANG_FONTS[lang]}&display=swap">'
                      if lang in LANG_FONTS else ""),
        "lang_menu": "".join(f'<a href="{BASE}{lang_home(c)}" hreflang="{c}" lang="{c}"{" aria-current=\"true\"" if c == lang else ""}>{n}</a>'
                             for c, n in SITE_LANGS),
        "lang_code": lang.upper(),
    }
    for key in ("scanner", "tools", "learn", "pricing", "download"):
        ctx[f"nav_{key}"] = ' aria-current="page"' if nav == key else ""
    html_out = localize(render(read(TPL / "base.html"), ctx), lang)
    dest = OUT / path / "index.html" if not path.endswith(".html") else OUT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html_out, encoding="utf-8")
    if sitemap:
        SITEMAP.append((path, sitemap[1] or TODAY.isoformat(), sitemap[0]))


# --------------------------------------------------------------------------- shared blocks
DEFAULT_PLANS = [
    {"id": "premium", "label": "Premium", "monthly": 19.99, "yearly": 149.99, "features": [
        "No pop-up or video ads", "Top 50% of crypto pairs plus every forex pair, gold, oil, indices and US stocks",
        "Every timeframe from 1 minute to 1 month", "Multi-timeframe matrix", "Funding and open interest tracker",
        "Unlimited market analysis", "AI chart analyzer, 15 a day", "AI economic-calendar impact",
        "Full trading academy including the Pro module", "40 alerts including breakout, volume and trend"]},
    {"id": "elite", "label": "Elite", "monthly": 39.99, "yearly": 299.99, "features": [
        "Everything in Premium", "Every crypto pair in the scanner", "Gold and BTC deep analysis with trade plans",
        "Whale and unusual activity radar with alerts", "Best Trades: the top setups in every market",
        "Unlimited alerts", "AI chart analyzer, 50 a day", "Priority support"]},
]
FREE_FEATURES = ["Scanner on the 1H, 4H and 1D timeframes", "Top 40 crypto pairs and the major forex pairs",
                 "3 detailed market analyses a day", "4 price and RSI alerts", "Risk, Fibonacci and market-hours tools",
                 "Discussion rooms, news and economic calendar", "Spin and earn coins toward Premium"]


def plans_html(app: str = "") -> str:
    app = app or f"{BASE}app/"
    def li(items):
        return "".join(f"<li>{ICONS['check']}<span>[[{esc(x)}]]</span></li>" for x in items)
    cards = [f'''<div class="plan"><span class="plan-ic">🌱</span><h3>[[Free]]</h3><p class="muted" style="margin:0">[[For trying Alice and learning the market]]</p>
  <div class="price">$0</div><div class="alt">[[Free forever]]</div><ul>{li(FREE_FEATURES)}</ul>
  <a class="btn btn-line" href="{app}#/signup">[[Create a free account]]</a></div>''']
    for p in DEFAULT_PLANS:
        feat = p["id"] == "elite"
        save = round(100 - p["yearly"] / (p["monthly"] * 12) * 100)
        cards.append(f'''<div class="plan{' featured' if feat else ' premium'}" data-plan="{p['id']}">{'<span class="plan-tag">[[Most complete]]</span>' if feat else '<span class="plan-tag blue">[[Most popular]]</span>'}<span class="plan-ic">{'👑' if feat else '⭐'}</span><h3>{p['label']}</h3>
  <p class="muted" style="margin:0">{'[[For traders who want the edge in every market]]' if feat else '[[For active traders who want every market]]'}</p>
  <div class="price" data-price="{p['id']}">${p['monthly']:.2f}<small> / [[month]]</small></div>
  <div class="alt" data-alt="{p['id']}">[[or]] ${p['yearly']:.2f} [[a year]], [[save]] {save}%</div>
  <ul data-features="{p['id']}">{li(p['features'])}</ul>
  <a class="btn {'btn-gold' if feat else 'btn-blue'}" href="{app}#/upgrade?plan={p['id']}">[[Get]] {p['label']}</a></div>''')
    return (f'<div class="plans">{"".join(cards)}</div>'
            '<p class="pay-note">[[Website payments: USDT (TRC20 or BEP20) or Bitcoin, activated by our team after checking the '
            'transaction, usually within a few hours. In the Android app you can also pay with Google Play.]] '
            '[[Or earn Premium free with coins from spins, referrals and partner exchanges.]]</p>')


def downloads_html() -> str:
    play = SITE.get("google_play_url", "").strip()
    ios = SITE.get("app_store_url", "").strip()
    play_block = (f'<a class="btn btn-line" href="{esc(play)}" rel="noopener">{ICONS["play"]}[[Open Google Play]]</a>' if play else
                  '<span class="btn btn-line" aria-disabled="true">[[Coming soon]]</span>')
    ios_block = (f'<a class="btn btn-line" href="{esc(ios)}" rel="noopener">{ICONS["apple"]}[[Open the App Store]]</a>' if ios else
                 f'<a class="btn btn-gold" href="{BASE}app/">[[Open the web app]]</a>')
    return f'''<div class="downloads">
  <div class="dl">
    <div class="dl-head">{ICONS["android"]}<div><b>Android</b><span data-apk-version>[[Direct download (APK)]]</span></div></div>
    <p>[[Download the latest version straight from our server. Your phone may ask you to allow installs from your browser the first time.]]</p>
    <a class="btn btn-gold" data-apk-link href="{esc(API)}/download">{ICONS["download"]}[[Download the APK]]</a>
  </div>
  <div class="dl{'' if play else ' soon'}">
    <div class="dl-head">{ICONS["play"]}<div><b>Google Play</b><span>{'[[Available now]]' if play else '<span class="badge-soon">[[In review]]</span>'}</span></div></div>
    <p>{'[[Install from Google Play to get automatic updates and pay with your Google account.]]' if play else '[[Alice is being reviewed by Google Play. The link will appear here as soon as it is live.]]'}</p>
    {play_block}
  </div>
  <div class="dl{'' if ios else ' soon'}">
    <div class="dl-head">{ICONS["apple"]}<div><b>[[iPhone and iPad]]</b><span>{'App Store' if ios else '<span class="badge-soon">[[App Store coming soon]]</span>'}</span></div></div>
    <ol class="ios-steps">
      <li><span>[[Open]] <b>{esc(SITE_URL.replace("https://", ""))}{BASE}app</b> [[in Safari]]</span></li>
      <li><span>[[Tap the Share button]] {ICONS["share"]}</span></li>
      <li><span>[[Choose]] <b>[[Add to Home Screen]]</b> {ICONS["plus"]}</span></li>
    </ol>
    {ios_block}
  </div>
</div>'''


HOME_FAQ = [
    ("Is Alice Forex/Crypto Scanner free?", "Yes. The free plan includes the scanner on the 1H, 4H and 1D timeframes, the top crypto pairs and major forex pairs, alerts, the discussion rooms and every free tool on this website. Premium and Elite unlock every market, every timeframe and the pro tools."),
    ("Can I use Alice on iPhone?", "Yes. Open the web app in Safari, tap Share and choose Add to Home Screen. Alice then opens full screen from its own icon, like a normal app. A native App Store version is on the way."),
    ("Is my website account the same as my app account?", "Yes. Log in with the same email and password on the website, the Android app and iPhone. Your plan, alerts, coins and settings follow you."),
    ("How do I pay on the website?", "On the website you pay with USDT (TRC20 or BEP20) or Bitcoin. Send the exact amount shown, paste the transaction ID and add a screenshot. Our team checks the payment and activates your plan, usually within a few hours."),
    ("What does the score from 0 to 100 mean?", "It combines trend, momentum, volume, market structure, breakouts and the higher timeframe. Scores above 65 lean bullish, below 35 lean bearish, and the middle is neutral or ranging. It is a fast way to filter markets, not a guarantee of where price will go."),
    ("Does Alice give financial advice?", "No. Alice is an analysis and education tool. Scores, Best Trades and analyses are generated from market data and are not recommendations. Always manage your risk and only trade money you can afford to lose."),
]


def tool_links_html(exclude: str = "") -> str:
    return "\n".join(
        f'<a class="tool-link" href="{BASE}tools/{s}/"><span class="ic" aria-hidden="true">{e}</span><span><b>{esc(n)}</b><span>{esc(d)}</span></span></a>'
        for s, n, d, e, _ in TOOLS if s != exclude)


# --------------------------------------------------------------------------- home page blocks (text in [[ ]] is translated)
FREE_TOOLS = [  # emoji, name, description, app route
    ("📡", "Market scanner", "1H, 4H and 1D timeframes, top 40 crypto pairs and major forex pairs", "#/scanner"),
    ("🔔", "Price and RSI alerts", "4 alerts checked by our server around the clock", "#/alerts"),
    ("🤖", "AI chart analyzer", "1 analysis a day: trend, levels and a trade idea", "#/ai"),
    ("📐", "Fibonacci, pivots and levels", "Support and resistance, Fibonacci and pivot points", "#/fib"),
    ("⏰", "Market hours and currency strength", "Forex sessions and crypto peak hours", "#/strength"),
    ("📅", "Economic calendar and news", "High-impact events and market headlines", "#/calendar"),
    ("💬", "Discussion rooms", "15 messages a day in the crypto and forex rooms", "#/chat/crypto"),
    ("📔", "Journal and portfolio", "20 trades a month and 5 holdings", "#/journal"),
    ("🧮", "Risk calculator", "Position size, lots and margin", "#/risk"),
    ("🎡", "Spin and earn", "Daily spins and referral coins toward Premium", "#/spin"),
]
PRO_TOOLS = [  # emoji, name, description, tier, app route
    ("🏆", "Best Trades", "Top setups in every market with entry, stop loss and two targets", "elite", "#/best"),
    ("🥇", "Gold and BTC deep analysis", "Daily verdict and trade plan. 7-day free trial for everyone", "elite", "#/gold"),
    ("🐋", "Whale and unusual activity radar", "Big orders, pumps, dumps and money flow with instant alerts", "elite", "#/activity"),
    ("🌐", "Every market and timeframe", "All forex pairs, gold, oil, indices, US stocks and 1M to 1M", "premium", "#/scanner"),
    ("🧭", "Multi-timeframe matrix", "15M, 1H, 4H and 1D scores side by side", "premium", "#/scanner"),
    ("📊", "Funding and open interest", "Spot crowded longs and shorts before a squeeze", "premium", "#/funding"),
    ("🧠", "Smart money concepts", "Order blocks, fair value gaps, liquidity and BOS on the chart", "premium", "#/scanner"),
    ("🤖", "AI analyzer 15 to 50 a day", "Plus AI impact analysis of economic events", "premium", "#/ai"),
    ("🎓", "Full academy and Pro module", "All 48 lessons and every trader story", "premium", "#/academy"),
    ("🧮", "Risk calculator pro", "Liquidation price, fees and unlimited journal", "premium", "#/risk"),
]
COMPARE = [  # feature, free, premium, elite   ("✓" = included, "🔒" = locked, other text shown as is)
    ("Ads", "Banner and full-screen ads", "Small banner only", "Small banner only"),
    ("Scanner timeframes", "1H, 4H, 1D", "All 9, from 1M to 1M", "All 9, from 1M to 1M"),
    ("Crypto pairs", "Top 40", "Top 50%", "Every pair"),
    ("Forex, gold, oil, indices, US stocks", "Major pairs", "✓", "✓"),
    ("Best Trades", "🔒", "🔒", "✓"),
    ("Gold and BTC deep analysis", "7-day trial", "7-day trial", "✓"),
    ("Whale and unusual activity radar", "Preview", "Preview", "✓ + alerts"),
    ("Market analysis", "3 a day", "Unlimited", "Unlimited"),
    ("AI chart analyzer", "1 a day", "15 a day", "50 a day"),
    ("AI economic-calendar impact", "🔒", "✓", "✓"),
    ("Multi-timeframe matrix", "🔒", "✓", "✓"),
    ("Funding and open interest", "🔒", "✓", "✓"),
    ("Smart money concepts", "🔒", "✓", "✓"),
    ("Alerts", "4", "40", "Unlimited"),
    ("Watchlist", "10", "200", "200"),
    ("Trading journal", "20 trades a month", "Unlimited", "Unlimited"),
    ("Portfolio tracker", "5 holdings", "Unlimited", "Unlimited"),
    ("Risk calculator: liquidation and fees", "🔒", "✓", "✓"),
    ("Trading academy", "First lesson", "All 48 lessons", "All 48 lessons"),
    ("Trader stories", "1 story", "All stories", "All stories"),
    ("Discussion rooms", "15 messages a day", "Unlimited", "Unlimited"),
    ("Notifications on phone and computer", "✓", "✓", "✓ + whale alerts"),
    ("Spin, referral and exchange rewards", "✓", "✓", "✓"),
    ("Priority support", "—", "—", "✓"),
]
LESSONS = [  # title, free
    ("Forex, Crypto & Gold — How These Markets Work", True), ("Reading Candlestick Charts", False),
    ("Support & Resistance Zones", False), ("RSI — Momentum, Overbought & Oversold", False),
    ("Trading Gold (XAU/USD)", False), ("Position Sizing & Risk per Trade", False),
    ("SMC 1 — Market Structure, BOS & CHoCH", False), ("Advanced 1 — Wyckoff Accumulation & Distribution", False),
    ("Pro 6 — Top-Down Analysis: From the Daily Chart to the Entry", False),
]


def free_tools_html(app: str) -> str:
    return "\n".join(f'<a class="tcard" href="{app}{r}"><span class="emo">{e}</span><span><b>[[{esc(n)}]]</b><small>[[{esc(d)}]]</small></span>'
                     f'<span class="tag free">[[Free]]</span></a>' for e, n, d, r in FREE_TOOLS)


def pro_tools_html(app: str) -> str:
    out = []
    for e, n, d, tier, r in PRO_TOOLS:
        t = "Elite" if tier == "elite" else "Premium"
        out.append(f'<a class="tcard locked {tier}" href="{app}{r}"><span class="emo">{e}<i class="lk">{ICONS["lock"]}</i></span>'
                   f'<span><b>[[{esc(n)}]]</b><small>[[{esc(d)}]]</small></span><span class="tag {"gold" if tier == "elite" else "sky"}">🔒 {t}</span></a>')
    return "\n".join(out)


def compare_html() -> str:
    def cell(v: str) -> str:
        if v == "✓":
            return f'<td class="yes">{ICONS["check"]}</td>'
        if v == "🔒":
            return f'<td class="no">{ICONS["lock"]}</td>'
        if v.startswith("✓ "):
            return f'<td class="yes">{ICONS["check"]}<small>[[{esc(v[2:])}]]</small></td>'
        return f'<td>[[{esc(v)}]]</td>' if v != "—" else '<td class="muted">—</td>'
    rows = "".join(f'<tr><th scope="row">[[{esc(f)}]]</th>{cell(a)}{cell(b)}{cell(c)}</tr>' for f, a, b, c in COMPARE)
    return (f'<div class="table-wrap compare"><table><thead><tr><th scope="col">[[Feature]]</th><th scope="col">[[Free]]</th>'
            f'<th scope="col">⭐ Premium</th><th scope="col" class="elite-col">👑 Elite</th></tr></thead><tbody>{rows}</tbody></table></div>')


def lessons_html(app: str) -> str:
    out = []
    for i, (t, free) in enumerate(LESSONS):
        if free:
            out.append(f'<li class="open"><a href="{app}#/lesson/markets-overview"><span class="n">1</span><span>{esc(t)}</span><span class="tag free">[[Free]]</span></a></li>')
        else:
            out.append(f'<li class="locked"><a href="{app}#/academy"><span class="n">{ICONS["lock"]}</span><span>{esc(t)}</span><span class="tag sky">🔒 Premium</span></a></li>')
    out.append(f'<li class="more"><a href="{app}#/academy"><span class="n">+39</span><span>[[more lessons: indicators, patterns, smart money, advanced and pro]]</span></a></li>')
    return "\n".join(out)


# --------------------------------------------------------------------------- articles
def load_articles() -> list[dict]:
    arts = []
    for p in sorted((CONTENT / "articles").glob("*.md")):
        meta, body = front_matter(read(p))
        if meta.get("draft", "").lower() == "true":
            continue
        slug = meta.get("slug") or p.stem
        main_md, faq = split_faq(body)
        words = len(re.findall(r"\w+", main_md))
        arts.append({
            "slug": slug, "title": meta.get("title", slug), "description": meta.get("description", ""),
            "date": meta.get("date", TODAY.isoformat()), "updated": meta.get("updated") or meta.get("date", TODAY.isoformat()),
            "category": meta.get("category", "basics").lower(), "keywords": meta.get("keywords", ""),
            "tools": [t.strip() for t in meta.get("tools", "").split(",") if t.strip()],
            "md": main_md, "faq": faq, "minutes": max(3, -(-words // 200)), "h1": meta.get("h1", meta.get("title", slug)),
        })
    arts.sort(key=lambda a: a["date"], reverse=True)
    return arts


def nice_date(iso: str) -> str:
    try:
        d = dt.date.fromisoformat(iso)
        return d.strftime("%B %-d, %Y") if os.name != "nt" else d.strftime("%B %d, %Y")
    except ValueError:
        return iso


def cover_path(a: dict) -> str:
    """static/img/articles/cover/<slug>.webp made by tools/make_images.py ('' if missing)."""
    rel = f"static/img/articles/cover/{a['slug']}.webp"
    return rel if (ROOT / rel).exists() else ""


def post_card(a: dict) -> str:
    name, cls = CATEGORIES.get(a["category"], ("Guide", "cat-basics"))
    cov = cover_path(a)
    img = (f'<span class="post-img"><img src="{BASE}{cov}" width="1600" height="900" alt="" loading="lazy" decoding="async"></span>'
           if cov else "")
    return (f'<a class="post{" has-img" if cov else ""}" href="{BASE}learn/{a["slug"]}/">{img}<span class="cat {cls}">{esc(name)}</span>'
            f'<h3>{esc(a["title"])}</h3><p>{esc(a["description"])}</p>'
            f'<time datetime="{a["date"]}">{nice_date(a["date"])}, {a["minutes"]} min read</time></a>')


def build_articles(arts: list[dict]) -> None:
    for a in arts:
        body, toc = md_to_html(a["md"])
        body = shortcodes(body)
        # mid-article ad: before the 3rd <h2>
        mid = ad("slot-article")
        if mid:
            parts = re.split(r"(?=<h2 )", body)
            if len(parts) > 3:
                parts.insert(3, mid)
                body = "".join(parts)
        top = ad("slot-top")
        if top:
            parts = re.split(r"(?=<h2 )", body, maxsplit=1)
            if len(parts) == 2:
                body = parts[0] + top + parts[1]
        if a["faq"]:
            body += f'<h2 id="faq">Frequently asked questions</h2>{faq_html(a["faq"])}'
            toc.append(("faq", "Frequently asked questions"))
        cat_name, cat_cls = CATEGORIES.get(a["category"], ("Guide", "cat-basics"))
        crumbs = [("Home", ""), ("Learn", "learn/"), (a["title"], f"learn/{a['slug']}/")]
        toc_items = "".join(f'<li><a href="#{i}">{esc(n)}</a></li>' for i, n in toc)
        related_tools = "".join(
            f'<a class="tool-link" href="{BASE}tools/{t}/"><span class="ic" aria-hidden="true">{TOOL_BY_SLUG[t][3]}</span><span><b>{esc(TOOL_BY_SLUG[t][1])}</b><span>{esc(TOOL_BY_SLUG[t][2])}</span></span></a>'
            for t in a["tools"] if t in TOOL_BY_SLUG)
        same = [x for x in arts if x["slug"] != a["slug"] and x["category"] == a["category"]]
        other = [x for x in arts if x["slug"] != a["slug"] and x["category"] != a["category"]]
        related = (same + other)[:3]
        page = f'''<div class="wrap">
  <header class="page-head">
    {crumbs_html(crumbs)}
    <span class="cat {cat_cls}" style="font-weight:600">{esc(cat_name)}</span>
    <h1 class="article-h1">{esc(a["h1"])}</h1>
    <p class="lead">{esc(a["description"])}</p>
    <div class="article-meta"><span>By the Alice Forex/Crypto Scanner team</span><span>Updated <time datetime="{a["updated"]}">{nice_date(a["updated"])}</time></span><span>{a["minutes"]} min read</span></div>
  </header>
  {f'<figure class="article-cover"><img src="{BASE}{cover_path(a)}" width="1600" height="900" alt="{esc(a["title"])}" fetchpriority="high"></figure>' if cover_path(a) else ""}
  <div class="layout">
    <article>
      <details class="toc-mobile"><summary>In this guide</summary><ol>{toc_items}</ol></details>
      <div class="prose">{body}
        <p class="disclaimer">This guide is for education only and is not financial advice. Trading involves a high risk of loss. Test any method on a demo account first and never risk money you cannot afford to lose.</p>
      </div>
      {f'<section class="related"><h2>Free tools for this guide</h2><div class="tool-list">{related_tools}</div></section>' if related_tools else ''}
      <section class="related"><h2>Keep learning</h2><div class="post-list">{"".join(post_card(r) for r in related)}</div></section>
    </article>
    <aside>
      <nav class="toc" aria-label="In this guide"><b>In this guide</b><ol>{toc_items}</ol></nav>
      <div class="side-card"><b>Scan the market with Alice</b><p>Every crypto, forex and gold market scored from 0 to 100, live.</p><a class="btn btn-gold btn-sm" href="{BASE}app/">Open the web app</a></div>
      {ad("slot-sidebar", "ad-side")}
    </aside>
  </div>
</div>'''
        art_ld = {"@type": "Article", "headline": a["title"], "description": a["description"], "datePublished": a["date"],
                  "dateModified": a["updated"], "mainEntityOfPage": url(f"learn/{a['slug']}/"), "image": url(cover_path(a) or "static/img/og-image.png"),
                  "author": {"@type": "Organization", "name": "Alice Forex/Crypto Scanner", "url": url()},
                  "publisher": {"@id": url("#org")}, "articleSection": cat_name, "keywords": a["keywords"]}
        write_page(f"learn/{a['slug']}/", title=a["title"] + (" | Alice Forex/Crypto Scanner" if len(a["title"]) <= 36 else ""), og_title=a["title"],
                   description=a["description"], body=page, nav="learn", og_type="article", og_image=cover_path(a),
                   jsonld=ld(ORG, art_ld, crumbs_ld(crumbs), faq_ld(a["faq"]) if a["faq"] else {}),
                   sitemap=("0.8", a["updated"]))

    # index + category pages
    def index_page(path: str, title: str, h1: str, lead: str, items: list[dict], current: str) -> None:
        cur = ' aria-current="page"'
        chips = [f'<a class="chip" href="{BASE}learn/"{cur if current == "" else ""}>All guides</a>']
        for k, (n, _) in CATEGORIES.items():
            if any(x["category"] == k for x in arts):
                chips.append(f'<a class="chip" href="{BASE}learn/{k}/"{cur if current == k else ""}>{esc(n)}</a>')
        crumbs = [("Home", ""), ("Learn", "learn/")] + ([(CATEGORIES[current][0], path)] if current else [])
        body = f'''<div class="wrap"><header class="page-head">{crumbs_html(crumbs)}<h1>{esc(h1)}</h1><p class="lead">{esc(lead)}</p></header>
<div class="chips">{"".join(chips)}</div>{ad("slot-top")}
<div class="post-list" style="padding-bottom:64px">{"".join(post_card(a) for a in items)}</div></div>'''
        coll = {"@type": "CollectionPage", "name": h1, "url": url(path), "hasPart": [
            {"@type": "Article", "headline": a["title"], "url": url(f"learn/{a['slug']}/")} for a in items]}
        write_page(path, title=title, description=lead, body=body, nav="learn", jsonld=ld(ORG, coll, crumbs_ld(crumbs)),
                   sitemap=("0.7", ""))

    index_page("learn/", "Learn trading: forex, crypto and gold guides | Alice Forex/Crypto Scanner", "Learn to trade with a plan",
               "Practical guides on forex, crypto and gold: position sizing, market hours, indicators, smart money concepts and risk management.",
               arts, "")
    for k, (n, _) in CATEGORIES.items():
        items = [a for a in arts if a["category"] == k]
        if items:
            index_page(f"learn/{k}/", f"{n} trading guides | Alice Forex/Crypto Scanner", f"{n} guides",
                       f"Step-by-step {n.lower()} guides from the Alice Forex/Crypto Scanner team.", items, k)

    # RSS feed
    entries = "".join(
        f"<item><title>{xml_escape(a['title'])}</title><link>{url('learn/' + a['slug'] + '/')}</link>"
        f"<guid>{url('learn/' + a['slug'] + '/')}</guid><pubDate>{dt.datetime.fromisoformat(a['date']).strftime('%a, %d %b %Y 08:00:00 +0000')}</pubDate>"
        f"<description>{xml_escape(a['description'])}</description></item>" for a in arts[:30])
    feed = (f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Alice Forex/Crypto Scanner Learn</title>'
            f'<link>{url("learn/")}</link><description>Forex, crypto and gold trading guides</description>{entries}</channel></rss>')
    (OUT / "learn" / "feed.xml").write_text(feed, encoding="utf-8")


# --------------------------------------------------------------------------- tools
def build_tools() -> None:
    for slug, name, short, emoji, widget in TOOLS:
        meta, text = front_matter(read(CONTENT / "tools" / f"{slug}.md"))
        main_md, faq = split_faq(text)
        body_html, _ = md_to_html(main_md)
        body_html = shortcodes(body_html)
        widget_html = render(read(TPL / "tools" / f"{widget}.html"), {"base": BASE, "api": API})
        crumbs = [("Home", ""), ("Free tools", "tools/"), (name, f"tools/{slug}/")]
        page = f'''<div class="wrap">
  <header class="page-head">{crumbs_html(crumbs)}<h1 style="max-width:24ch">{esc(meta.get("h1", name))}</h1><p class="lead">{esc(meta.get("intro", short))}</p></header>
  <div class="tool-box" data-tool="{widget}">{widget_html}</div>
  {ad("slot-top")}
  <div class="layout">
    <article><div class="prose">{body_html}</div>
      {f'<h2 style="margin-top:48px">Frequently asked questions</h2>{faq_html(faq)}' if faq else ''}
      <p class="disclaimer">Results are estimates for education and planning. Broker contract sizes, fees and margin rules differ, so always confirm on your platform before you trade.</p>
      <section class="related"><h2>More free tools</h2><div class="tool-list">{tool_links_html(slug)}</div></section>
    </article>
    <aside>
      <div class="side-card"><b>Let the scanner find the trade</b><p>Alice scores every crypto, forex and gold market from 0 to 100 so you know where to look.</p><a class="btn btn-gold btn-sm" href="{BASE}app/">Open the web app</a></div>
      {ad("slot-sidebar", "ad-side")}
    </aside>
  </div>
</div>'''
        app_ld = {"@type": "WebApplication", "name": meta.get("h1", name), "url": url(f"tools/{slug}/"),
                  "applicationCategory": "FinanceApplication", "operatingSystem": "Any", "isAccessibleForFree": True,
                  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": meta.get("description", short)}
        write_page(f"tools/{slug}/", title=meta.get("title", f"{name} | Alice Forex/Crypto Scanner"),
                   description=meta.get("description", short), body=page, nav="tools",
                   jsonld=ld(ORG, app_ld, crumbs_ld(crumbs), faq_ld(faq) if faq else {}),
                   extra_js=f'<script src="{BASE}assets/js/tools.js?v={VERSION}" defer></script>', sitemap=("0.9", ""))

    crumbs = [("Home", ""), ("Free tools", "tools/")]
    body = f'''<div class="wrap"><header class="page-head">{crumbs_html(crumbs)}<h1>Free trading tools</h1>
<p class="lead">Calculators and market tools for forex, crypto and gold traders. They run in your browser, need no account and work on any phone.</p></header>
<div class="tool-list" style="padding-bottom:40px">{tool_links_html()}</div>
<div class="cta-band" style="margin-bottom:72px"><div><h2>Want the pro tools too?</h2><p>The web app adds the live scanner, AI chart analyzer, alerts, whale radar, journal and portfolio tracker.</p></div>
<div class="btns"><a class="btn btn-gold" href="{BASE}app/#/tools">Open the pro tools</a></div></div></div>'''
    write_page("tools/", title="Free trading calculators and tools for forex, crypto and gold | Alice Forex/Crypto Scanner",
               description="Free position size, pip value, risk reward, Fibonacci, pivot, liquidation, margin and compounding calculators, plus live forex market hours and a currency converter.",
               body=body, nav="tools", jsonld=ld(ORG, crumbs_ld(crumbs)), sitemap=("0.9", ""))


# --------------------------------------------------------------------------- simple pages
def build_pages() -> None:
    for p in sorted((CONTENT / "pages").glob("*.md")):
        meta, text = front_matter(read(p))
        body_html, _ = md_to_html(text)
        body_html = render(body_html, {"base": BASE, "api": API, "site_url": SITE_URL + BASE,
                                       "email": esc(SITE.get("contact_email", "")), "telegram": esc(SITE.get("telegram_support", "")),
                                       "updated": nice_date(meta.get("updated", TODAY.isoformat()))})
        slug = p.stem
        crumbs = [("Home", ""), (meta.get("title", slug), f"{slug}/")]
        page = f'''<div class="wrap"><header class="page-head">{crumbs_html(crumbs)}<h1>{esc(meta.get("h1", meta.get("title", slug)))}</h1>
{f'<p class="lead">{esc(meta["lead"])}</p>' if meta.get("lead") else ''}</header>
<div class="prose" style="padding-bottom:72px">{body_html}</div></div>'''
        t = meta.get("title", slug)
        write_page(f"{slug}/", title=t if "Alice Forex/Crypto Scanner" in t else f"{t} | Alice Forex/Crypto Scanner", description=meta.get("description", ""),
                   body=page, jsonld=ld(ORG, crumbs_ld(crumbs)), sitemap=("0.3", ""))


def build_home(arts: list[dict], lang: str) -> None:
    app = app_url(lang)
    body = render(read(TPL / "home.html"), {
        "base": BASE, "app": app, "tool_links": tool_links_html(), "plans": plans_html(app), "downloads": downloads_html(),
        "latest_posts": "\n".join(post_card(a) for a in arts[:6]), "faq": faq_html([(f"[[{q}]]", f"[[{a}]]") for q, a in HOME_FAQ], open_first=True),
        "ad_home": f'<div class="wrap">{ad("slot-home")}</div>' if ad("slot-home") else "",
        "free_tools": free_tools_html(app), "pro_tools": pro_tools_html(app), "compare": compare_html(), "lessons": lessons_html(app),
        "channel": esc(SITE.get("telegram_channel", "")), "tg": esc(SITE.get("telegram_support", "")),
    })
    app_ld = {"@type": "SoftwareApplication", "name": "Alice Forex/Crypto Scanner", "operatingSystem": "Android, iOS, Web",
              "applicationCategory": "FinanceApplication", "url": url(), "image": url("static/img/icons/icon-512.png"),
              "description": SITE["description"], "inLanguage": [c for c, _ in SITE_LANGS],
              "offers": [{"@type": "Offer", "price": "0", "priceCurrency": "USD", "name": "Free"},
                         {"@type": "Offer", "price": "19.99", "priceCurrency": "USD", "name": "Premium monthly"},
                         {"@type": "Offer", "price": "39.99", "priceCurrency": "USD", "name": "Elite monthly"}]}
    website = {"@type": "WebSite", "@id": url("#site"), "name": "Alice Forex/Crypto Scanner", "url": url(), "publisher": {"@id": url("#org")}}
    faq_items = [(localize(f"[[{q}]]", lang), localize(f"[[{a}]]", lang)) for q, a in HOME_FAQ]
    alternates = "\n".join(f'<link rel="alternate" hreflang="{c}" href="{url(lang_home(c))}">' for c, _ in SITE_LANGS) + \
        f'\n<link rel="alternate" hreflang="x-default" href="{url()}">'
    title = localize("[[Alice Forex/Crypto Scanner: free crypto, forex and gold market scanner]]", lang)
    desc = localize("[[Free crypto, forex and gold market scanner. Every market scored 0–100, Best Trades, Gold & BTC deep analysis, alerts and pro trading tools. Works on Android, iPhone and desktop.]]", lang)
    write_page(lang_home(lang), title=title, og_title="Alice Forex/Crypto Scanner", description=desc,
               body=localize(body, lang), jsonld=ld(ORG, website, app_ld, faq_ld(faq_items)),
               extra_js=f'<script src="{BASE}assets/js/board.js?v={VERSION}" defer></script>', sitemap=("1.0" if lang == "en" else "0.8", ""),
               body_class="home", lang=lang, alternates=alternates)


def build_special(arts: list[dict]) -> None:
    for code, _ in SITE_LANGS:
        build_home(arts, code)

    # pricing
    crumbs = [("Home", ""), ("Pricing", "pricing/")]
    pricing_faq = [
        ("Which payment methods can I use?", "On the website: USDT on TRC20 (TRON) or BEP20 (BNB Smart Chain), or Bitcoin. In the Android app from Google Play you can also pay with Google Play billing."),
        ("How fast is my plan activated?", "After you submit the transaction ID and screenshot, our team checks the payment on the blockchain and activates your plan, usually within a few hours. You get a notification in the app when it is active."),
        ("Do I need a separate plan for the app and the website?", "No. One plan works everywhere: website, Android and iPhone. Just log in with the same email."),
        ("Can I earn Premium for free?", "Yes. Spin the wheel and invite friends to collect coins. 5,000 coins convert into one month of Premium and 10,000 coins into one month of Elite."),
        ("Can I get a refund?", "Crypto payments cannot be reversed on the blockchain, so please start with the free plan and the 7-day Gold and BTC analysis trial before you upgrade. If something goes wrong with your plan, contact support on Telegram and we will help."),
    ]
    body = f'''<div class="wrap"><header class="page-head">{crumbs_html(crumbs)}<h1>Plans and pricing</h1>
<p class="lead">Start free. Upgrade to Premium or Elite when you want every market, every timeframe and the pro tools. One plan covers the website, Android and iPhone.</p></header>
{plans_html()}
<h2 style="margin-top:48px">Compare every feature</h2>
{compare_html()}
<section class="section" style="padding-top:56px"><h2>Pricing questions</h2>{faq_html(pricing_faq)}</section></div>'''
    product = {"@type": "Product", "name": "Alice Forex/Crypto Scanner Premium and Elite", "brand": {"@type": "Brand", "name": "Alice Forex/Crypto Scanner"},
               "offers": [{"@type": "Offer", "price": f"{p['monthly']:.2f}", "priceCurrency": "USD", "name": f"{p['label']} monthly", "url": url("pricing/")} for p in DEFAULT_PLANS]}
    write_page("pricing/", title="Pricing: Free, Premium and Elite plans | Alice Forex/Crypto Scanner",
               description="Compare the free, Premium and Elite plans of the Alice crypto and forex scanner. Pay with USDT or Bitcoin. One plan works on the website, Android and iPhone.",
               body=body, nav="pricing", jsonld=ld(ORG, product, crumbs_ld(crumbs), faq_ld(pricing_faq)),
               extra_js=f'<script src="{BASE}assets/js/board.js?v={VERSION}" defer></script>', sitemap=("0.8", ""))

    # download
    crumbs = [("Home", ""), ("Download", "download/")]
    dl_faq = [
        ("Is the APK safe to install?", "The APK is the same app we publish, served directly from our own server over HTTPS. Android asks you to allow installs from your browser once; you can switch that permission off again after installing."),
        ("Will the APK update itself?", "The app checks our server and shows an update message when a new version is ready. Tap Update to download the newest APK."),
        ("Why is there no App Store app yet?", "The iPhone app is in development. Until it is ready, the web app added to your home screen gives you the same features, full screen and with its own icon."),
    ]
    body = f'''<div class="wrap"><header class="page-head">{crumbs_html(crumbs)}<h1>Download Alice</h1>
<p class="lead">Use Alice on Android, iPhone and your computer with one account.</p></header>
{downloads_html()}
<section class="section" style="padding-top:56px"><h2>Install questions</h2>{faq_html(dl_faq)}</section></div>'''
    write_page("download/", title="Download the Alice Forex/Crypto Scanner app for Android and iPhone",
               description="Download the Alice crypto and forex scanner for Android (APK and Google Play) or add it to your iPhone home screen. One account on every device.",
               body=body, nav="download", jsonld=ld(ORG, crumbs_ld(crumbs), faq_ld(dl_faq)),
               extra_js=f'<script src="{BASE}assets/js/board.js?v={VERSION}" defer></script>', sitemap=("0.8", ""))

    # live scanner (public)
    crumbs = [("Home", ""), ("Live scanner", "scanner/")]
    body = render(read(TPL / "scanner.html"), {"base": BASE, "crumbs": crumbs_html(crumbs), "ad_top": ad("slot-top")})
    write_page("scanner/", title="Live crypto and forex scanner: strongest setups now | Alice Forex/Crypto Scanner",
               description="Free live market scanner. See the strongest bullish and bearish crypto, forex, gold and index setups right now, each scored from 0 to 100.",
               body=body, nav="scanner", jsonld=ld(ORG, crumbs_ld(crumbs)),
               extra_js=f'<script src="{BASE}assets/js/board.js?v={VERSION}" defer></script>', sitemap=("0.9", ""))

    # 404
    body = f'''<div class="wrap not-found"><h1>This page moved or never existed</h1><p class="muted">Check the address, or start from one of these.</p>
<p style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px"><a class="btn btn-gold" href="{BASE}">Home</a>
<a class="btn btn-line" href="{BASE}app/">Web app</a><a class="btn btn-line" href="{BASE}tools/">Free tools</a><a class="btn btn-line" href="{BASE}learn/">Guides</a></p></div>'''
    write_page("404.html", title="Page not found | Alice Forex/Crypto Scanner", description="This page could not be found.", body=body,
               robots="noindex", sitemap=None)


def build_app() -> None:
    """The web app (single page) lives at /app/ and talks to the VPS server."""
    tpl = read(TPL / "app.html")
    out = render(tpl, {"base": BASE, "v": VERSION, "api": API, "site_url": SITE_URL, "canonical": url("app/"),
                       "og_image": url("static/img/og-image.png"), "play_url": esc(SITE.get("google_play_url", "")),
                       "ios_url": esc(SITE.get("app_store_url", "")), "tg": esc(SITE.get("telegram_support", "")),
                       "ads_head": read(ROOT / "ads" / "head.html").strip(),
                       "slot_app": json.dumps(read(ROOT / "ads" / "slot-app.html").strip()),
                       "slot_spin": json.dumps(read(ROOT / "ads" / "slot-spin.html").strip()),
                       "slot_interstitial": json.dumps(read(ROOT / "ads" / "slot-interstitial.html").strip()),
                       "channel": esc(SITE.get("telegram_channel", "")),
                       "analytics": ""})
    (OUT / "app").mkdir(parents=True, exist_ok=True)
    (OUT / "app" / "index.html").write_text(out, encoding="utf-8")
    SITEMAP.append(("app/", TODAY.isoformat(), "0.7"))


def build_meta() -> None:
    entries = "".join(f"<url><loc>{url(p)}</loc><lastmod>{m}</lastmod><priority>{pr}</priority></url>" for p, m, pr in SITEMAP)
    (OUT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>',
        encoding="utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {url('sitemap.xml')}\n", encoding="utf-8")
    ads_txt = read(ROOT / "ads" / "ads.txt").strip()
    if ads_txt:
        (OUT / "ads.txt").write_text(ads_txt + "\n", encoding="utf-8")
    manifest = {
        "name": "Alice Forex/Crypto Scanner", "short_name": "Alice Scanner", "id": BASE + "app/",
        "description": "Crypto, forex and gold market scanner with Best Trades, deep analysis, alerts and pro tools.",
        "start_url": BASE + "app/?source=pwa", "scope": BASE, "display": "standalone", "orientation": "any",
        "background_color": "#0A0E17", "theme_color": "#0A0E17", "categories": ["finance", "business", "education"],
        "icons": [
            {"src": BASE + "static/img/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": BASE + "static/img/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": BASE + "static/img/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        "shortcuts": [
            {"name": "Scanner", "url": BASE + "app/#/scanner"},
            {"name": "Best Trades", "url": BASE + "app/#/best"},
            {"name": "Tools", "url": BASE + "app/#/tools"},
        ],
    }
    (OUT / "manifest.webmanifest").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    sw = read(ROOT / "assets" / "js" / "sw.template.js").replace("__VERSION__", VERSION).replace("__BASE__", BASE)
    (OUT / "sw.js").write_text(sw, encoding="utf-8")
    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    domain = (SITE.get("domain") or "").strip().removeprefix("https://").removeprefix("http://").strip("/")
    if domain:
        (OUT / "CNAME").write_text(domain + "\n", encoding="utf-8")


LANG_ORDER = ["ur", "hi", "ar", "zh", "es", "pt", "fr", "ru", "tr"]   # same order as the Android app's I18n.kt


def build_i18n() -> None:
    """i18n/app.json (copied from the Android app) + i18n/web.json (website texts) → assets/i18n/<lang>.json.
    Each entry: "English text": [ur, hi, ar, zh, es, pt, fr, ru, tr]. Texts with {name} placeholders become patterns."""
    merged: dict[str, list[str]] = {}
    files = sorted((ROOT / "i18n").glob("*.json"), key=lambda f: (f.name != "app.json", f.name))
    for f in files:   # app.json first, then the website files (web-*.json) can override
        for en, vals in json.loads(f.read_text(encoding="utf-8")).items():
            if len(vals) != len(LANG_ORDER):
                raise SystemExit(f"{f.name}: '{en}' needs {len(LANG_ORDER)} translations, has {len(vals)}")
            merged[en] = vals
    out = OUT / "assets" / "i18n"
    out.mkdir(parents=True, exist_ok=True)
    for i, code in enumerate(LANG_ORDER):
        exact, patterns = {}, {}
        for en, vals in merged.items():
            v = vals[i] if i < len(vals) else ""
            if not v:
                continue
            (patterns if re.search(r"\{\w+\}", en) else exact)[en] = v
        (out / f"{code}.json").write_text(json.dumps({"exact": exact, "patterns": patterns}, ensure_ascii=False, separators=(",", ":")),
                                          encoding="utf-8")


def main() -> None:
    global VERSION
    VERSION = asset_version()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(ROOT / "static", OUT / "static")
    shutil.copytree(ROOT / "assets", OUT / "assets", ignore=shutil.ignore_patterns("sw.template.js"))
    # cache-busting for the web app's modules: import "./core.js" → "./core.js?v=<version>"
    for js in (OUT / "assets" / "js" / "app").rglob("*.js"):
        src = js.read_text(encoding="utf-8")
        src = re.sub(r'(from\s+"\.{1,2}/[^"?]+\.js)"', rf'\1?v={VERSION}"', src)
        js.write_text(src, encoding="utf-8")
    build_i18n()
    arts = load_articles()
    build_special(arts)
    build_tools()
    build_articles(arts)
    build_pages()
    build_app()
    build_meta()
    print(f"Built {len(SITEMAP)} pages into {OUT} — site {SITE_URL}{BASE} · server {API} · version {VERSION}")


if __name__ == "__main__":
    main()
