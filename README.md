# Alice Forex/Crypto Scanner website

The website and web app for **Alice Forex/Crypto Scanner**. GitHub builds and publishes it automatically every time
something changes in this repository.

- **Website**: home page, live scanner, 11 free calculators, trading guides, pricing, download, legal pages
- **Web app** (`/app/`): the full Alice app in the browser. Works on phones, laptops and PCs, and installs on iPhone
  with Safari → Share → Add to Home Screen
- **Server**: everything live (accounts, plans, crypto payments, scanner, alerts, coins) comes from the Alice server
  set in `site.json`, so website and Android app share the same accounts

## Everyday changes (no coding)

Open the file on GitHub, click the ✏️ pencil, change it, then **Commit changes**. The website updates in about 2 minutes.

| What you want | File |
|---|---|
| Google Play link, App Store link, your own domain, Telegram, Google Analytics | `site.json` |
| Ad codes (AdSense and other companies) | files in the `ads` folder (see `ads/README.md`) |
| A new guide / article | add a `.md` file in `content/articles` (copy an existing one and change it) |
| About, contact, privacy, terms, risk pages | `content/pages` |
| Text on the free calculators | `content/tools` |

### Writing a new article

1. Open `content/articles`, click **Add file → Create new file**.
2. Name it with dashes, for example `how-to-trade-the-london-open.md`. This becomes the address of the page.
3. Start the file like this, then write the article below it:

```
---
title: How to Trade the London Open
description: One or two sentences that appear on Google (about 150 characters).
date: 2026-11-01
category: forex
tools: forex-market-hours, position-size-calculator
---
First paragraph...

## A heading

Text...

[[tool:position-size-calculator]]

[[app]]

## Frequently asked questions

### A question?

The answer.
```

- `category` is one of: `basics`, `forex`, `crypto`, `gold`, `strategy`
- `[[tool:...]]` adds a box that links to a free calculator, `[[app]]` adds a box that links to the web app
- A `## Frequently asked questions` section with `###` questions is shown as an FAQ and marked up for Google

## Your own domain

1. Buy a domain (for example `alicecryptoscanner.com`).
2. At the domain company, add these DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www` → `afkcyber007.github.io`
3. In `site.json` set `"domain": "alicecryptoscanner.com"` and commit.
4. In the repository **Settings → Pages**, type the domain under **Custom domain**, save, and tick **Enforce HTTPS** when it appears.

## Testing on your computer (optional)

```
pip install markdown
python build.py
python -m http.server -d _site 8000
```
Then open http://localhost:8000


## Languages

The home page is built in 10 languages: `/` (English), `/ur/`, `/hi/`, `/ar/`, `/zh/`, `/es/`, `/pt/`, `/fr/`, `/ru/`, `/tr/`.
Website texts are in `i18n-site/*.json`, web-app texts in `i18n/*.json` (`app.json` is copied from the Android app).
Each entry is `"English": [ur, hi, ar, zh, es, pt, fr, ru, tr]`. Guides and tools stay in English.

## Images

Article covers and diagrams are in `static/img/articles/`. They are made by `python tools/make_images.py`
(needs matplotlib and Pillow on your PC; GitHub only needs the finished images). Add a picture to a guide with
`![description](img:edu/head_shoulders.webp "caption")`.
