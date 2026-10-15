---
title: Position Size Calculator for Forex, Gold and Crypto (Free) | AliceCryptoScanner
description: Free position size calculator. Enter your balance, risk % and stop loss to get the exact lot size for forex and gold, or the quantity for crypto and stocks. Live prices included.
h1: Position size calculator
intro: Find the right lot size or coin quantity for every trade, so a stop loss never costs you more than you planned.
---
## How to use the position size calculator

1. Pick **Forex and metals** for currency pairs, gold and silver, or **Crypto and stocks** for anything you buy in units or coins.
2. Enter your **account balance** and how much of it you are willing to lose if the stop loss is hit, as a **percentage**. Many traders use 0.5% to 2%.
3. For forex, enter your **stop loss in pips**. For crypto and stocks, enter your **entry** and **stop loss prices**.
4. Read the result: the position size that loses exactly your chosen risk at the stop.

The calculator fills in the live price from the Alice server, which it needs to convert the pip value into your account currency on pairs like USD/JPY or EUR/GBP.

## The formula

For forex and metals the calculator works out what one pip is worth for one standard lot in your account currency, then divides your risk by the total pip risk:

<span class="formula">Lots = (Balance × Risk %) ÷ (Stop loss in pips × Pip value per lot)</span>

For crypto and stocks it is simpler, because you trade in units:

<span class="formula">Quantity = (Balance × Risk %) ÷ |Entry − Stop loss|</span>

### Example: EUR/USD

You have a $5,000 account and risk 1% ($50). Your stop is 25 pips away. One pip on a standard EUR/USD lot is worth $10, so 25 pips cost $250 per lot. $50 ÷ $250 = **0.20 lots** (two mini lots).

### Example: Bitcoin

You have $2,000 and risk 1.5% ($30). You buy BTC at 65,000 with a stop at 63,700, a distance of 1,300. $30 ÷ 1,300 = **0.023 BTC**. If price falls to your stop you lose about $30, plus fees.

## Why position size matters more than your entry

Two traders can take the same trade and get completely different results because of size. A fixed percentage risk keeps every loss small and similar, so one bad trade cannot wipe out a week of good ones, and a losing streak stays survivable. With 1% risk, ten losses in a row leave you with about 90% of your account. With 10% risk the same streak leaves you with about 35%.

Sizing from the stop loss also means you place the stop where the market says your idea is wrong, at a level that makes sense on the chart, and then adjust the size to fit, instead of squeezing the stop to fit a size you already picked.

[[app]]

## Frequently asked questions

### What is a good risk per trade?

Most professional guidelines sit between 0.5% and 2% of the account per trade. Beginners often do best at 1% or less while they learn, because it keeps losing streaks small.

### How big is a standard lot?

A standard forex lot is 100,000 units of the base currency. A mini lot is 10,000 and a micro lot is 1,000. On gold, one lot is usually 100 ounces; on silver, 5,000 ounces. Brokers can differ, so check your contract specification.

### Why does the calculator need the current price?

When the quote currency of the pair is not your account currency, the pip value has to be converted. For example, a pip on USD/JPY is worth 1,000 yen per standard lot, which is about $6 to $7 depending on the exchange rate.

### Does it include spread and commission?

No. Spreads and commissions add a little to every loss, so if you trade a very tight stop, round your size down slightly.
