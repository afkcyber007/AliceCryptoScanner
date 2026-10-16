# Ad codes for the website

Paste the code from your ad company into these files (open the file on GitHub → ✏️ pencil → paste → Commit).
An empty file = no ad and no empty space on the website.

| File | Where it shows |
|---|---|
| `head.html` | Inside `<head>` on every page. Put AdSense's main `<script ...adsbygoogle.js?client=ca-pub-...>` here, and any other company's "header" script. |
| `ads.txt` | Becomes `/ads.txt` — paste the lines AdSense and the other ad companies give you (one per line). |
| `slot-top.html` | Under the first section of every article and tool page. |
| `slot-article.html` | In the middle of articles (after the 2nd heading). |
| `slot-sidebar.html` | Right column next to articles on laptops / PCs (hidden on phones). |
| `slot-bottom.html` | At the bottom of every page, above the footer. |
| `slot-home.html` | On the home page between the tools list and the plans. |
| `slot-app.html` | Small banner at the bottom of the web app. Free users always see it; Premium/Elite see it only while the Telegram setting `/ads paidbanner on` is on (same as the Android app). |
| `slot-interstitial.html` | Full-screen ad in the web app — **free users only**, after every few screens (Telegram `/ads every`, `/ads gap`, `/ads first`, `/ads max` control it, same as the app). Empty = Alice shows its own “Go Premium” card instead. |
| `slot-spin.html` | The "sponsored" box shown for 5 seconds before every Spin & Earn spin in the web app. |

You can put code from different companies in different slots (for example AdSense in `slot-article.html`
and another network in `slot-sidebar.html`).
