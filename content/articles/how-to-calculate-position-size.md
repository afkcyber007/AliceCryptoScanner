---
title: How to Calculate Position Size in Forex and Crypto (With Examples)
description: Learn the position sizing formula that professional traders use. Step-by-step examples for forex, gold and Bitcoin, plus the mistakes that blow up accounts.
date: 2026-10-15
category: basics
keywords: position size, lot size calculator, how many lots to trade, forex position sizing, risk per trade
tools: position-size-calculator, pip-value-calculator, risk-reward-calculator
---
Ask ten losing traders what went wrong and most will talk about entries: they bought too early, sold too late, picked the wrong pair. Ask ten consistent traders what keeps them in the game and you will hear a different answer: **position size**. How much you buy or sell decides how much a wrong trade costs you, and that decides whether you are still trading next year.

This guide shows you how to calculate the right position size for every trade, with worked examples for forex, gold and crypto.

![Stop loss below structure with an ATR buffer](img:art/stop_loss.webp "Place the stop first, then size the position from the stop distance.")

## The idea in one sentence

You decide how much money you are willing to lose if the trade fails, you find where the trade fails (your stop loss), and you choose a size so that hitting the stop costs exactly that amount.

Notice the order. The stop loss comes from the chart, and the size comes from the stop. Most beginners do it backwards: they pick a size that "feels right", then squeeze the stop loss to make the possible loss look acceptable, and end up with stops so tight that normal market noise takes them out.

## Step 1: choose your risk per trade

Risk per trade is the share of your account you accept to lose on one idea. A fixed percentage is the simplest and most robust rule:

- **0.5% to 1%** suits most beginners and anyone trading high-volatility markets like small-cap crypto.
- **1% to 2%** is a common range for experienced traders with a tested method.
- **Above 2%** makes losing streaks painful very quickly.

Why so small? Because losing streaks are normal. Even a strategy that wins 55% of the time will regularly lose five or six trades in a row. Here is what ten losses in a row do to an account at different risk levels:

| Risk per trade | Account left after 10 losses |
|---|---|
| 1% | 90.4% |
| 2% | 81.7% |
| 5% | 59.9% |
| 10% | 34.9% |

At 1% you shrug and keep going. At 10% you need almost a 190% gain just to get back to where you started.

## Step 2: place the stop loss where the idea is wrong

Your stop loss should sit at a price that proves your trade idea wrong, not at a round number of pips you picked in advance. For a long trade that is usually just below a support level, a recent swing low or an order block. For a short, just above resistance or a swing high.

Add a small buffer for the spread and normal noise. A stop that sits exactly on an obvious level is often hit by a quick wick before price turns.

## Step 3: calculate the size

### The forex formula

<span class="formula">Lots = Money at risk ÷ (Stop loss in pips × Pip value per lot)</span>

For any pair quoted in US dollars, such as EUR/USD, GBP/USD or AUD/USD, one pip on one standard lot (100,000 units) is worth $10 when your account is in dollars.

**Example.** Your account holds $4,000 and you risk 1%, so $40. You buy EUR/USD with a stop 20 pips below entry.

- Cost per lot if the stop is hit: 20 pips × $10 = $200
- Position size: $40 ÷ $200 = **0.20 lots**

If your account is in another currency, or the pair is not quoted in your account currency (USD/JPY, EUR/GBP), the pip value has to be converted. That is exactly what the free calculator does for you with live prices.

[[tool:position-size-calculator]]

### The gold formula

Most brokers trade gold (XAU/USD) in lots of 100 ounces. A $1 move in the gold price is therefore worth $100 per lot.

**Example.** $10,000 account, 1% risk = $100. You buy gold at 2,400 with a stop at 2,388, a distance of $12.

- Cost per lot: $12 × 100 oz = $1,200
- Position size: $100 ÷ $1,200 = **0.08 lots**

Gold moves a lot during US data releases. If you trade around them, use a wider stop and a smaller size, never the other way round.

### The crypto and stocks formula

When you trade coins or shares you work in units directly:

<span class="formula">Quantity = Money at risk ÷ |Entry price − Stop price|</span>

**Example.** $2,500 account, 1% risk = $25. You buy ETH at 3,200 with a stop at 3,040, a distance of 160.

- Quantity: $25 ÷ 160 = **0.156 ETH**, about $500 worth

Leverage does not change this calculation. It only changes how much margin the exchange holds. A $500 position at 5x leverage needs $100 of margin, but the loss at the stop is still $25.

## Step 4: check the trade still makes sense

Once you know the size, check two things before you click:

1. **Risk to reward.** If the nearest realistic target is closer than your stop, the trade probably is not worth taking. Many traders want at least 1:1.5 or 1:2.
2. **Margin.** On leveraged products make sure the margin is a modest part of your balance and that your liquidation price, if there is one, is far beyond your stop.

## Common position sizing mistakes

**Using the same lot size on every trade.** A 0.5-lot trade with a 10-pip stop and a 0.5-lot trade with a 60-pip stop carry six times different risk. Size from the stop every time.

**Increasing size after losses to win it back.** This is the fastest way to turn a normal losing streak into a blown account.

**Forgetting correlation.** Buying EUR/USD, GBP/USD and AUD/USD at 1% each is close to one 3% bet against the US dollar. Treat correlated positions as one.

**Ignoring the spread and fees.** On very tight stops, the spread can be a large part of the risk. Round your size down.

## Make it automatic

Doing these sums by hand on every trade is slow and invites mistakes. Use the calculator before every trade until it becomes a habit, and keep a trading journal that records the risk you actually took. In the Alice web app, the Risk Calculator Pro tool also shows margin, estimated liquidation price and targets for leveraged crypto trades.

[[app]]

## Frequently asked questions

### How many lots should I trade with $100?

With $100 and 1% risk you risk $1. On EUR/USD with a 20-pip stop that is 0.005 lots, smaller than most brokers allow (0.01 is a common minimum). Either widen your risk slightly, look for a broker with nano lots, or practise on a demo account until the balance is larger.

### Is 2% risk per trade too much?

Not necessarily, but it doubles the depth of every losing streak compared with 1%. If you are still learning or your results are inconsistent, start at 0.5% to 1%.

### Should I risk a fixed dollar amount or a percentage?

A percentage automatically shrinks your size after losses and grows it after wins, which protects your account. A fixed amount is fine for short periods, but update it regularly as your balance changes.
