---
title: Crypto Funding Rates and Open Interest Explained
description: What perpetual futures funding rates and open interest tell you about crypto market positioning, how to read them together, and how traders use them to spot squeezes.
date: 2026-10-15
category: crypto
keywords: funding rate, open interest, crypto funding rates explained, perpetual futures, short squeeze, long squeeze
tools: liquidation-price-calculator, crypto-profit-calculator
---
Price tells you where the market is. Funding rates and open interest tell you who is positioned and how crowded the trade is. For crypto traders, especially in Bitcoin and the large altcoins, these two numbers are among the most useful pieces of information you can add to a chart.

## Perpetual futures in one minute

![Liquidity sweep of crowded positions](img:edu/liquidity_sweep.webp "Crowded positions get swept: funding and open interest show where the crowd is.")

Most crypto trading volume happens in **perpetual futures**, contracts that track the price of a coin but never expire. Because there is no expiry date to pull the contract price back to the spot price, exchanges use a **funding rate** instead.

## What the funding rate is

Every funding interval, often every 8 hours on major exchanges, traders on one side of the market pay traders on the other side:

- **Positive funding:** longs pay shorts. The perpetual is trading above spot, usually because more traders want to be long.
- **Negative funding:** shorts pay longs. The perpetual is trading below spot, usually because shorts dominate.

On many exchanges the baseline rate when the market is balanced is about **0.01% per 8 hours**. It does not sound like much, but it applies to the whole leveraged position. At 0.1% every 8 hours, a long position pays about 0.3% a day, or roughly 9% a month, just to stay open.

## What open interest is

**Open interest (OI)** is the total value of futures contracts that are currently open. Each contract has a buyer and a seller, so OI does not tell you whether longs or shorts are winning; it tells you how much leveraged money is in the market.

- **Rising OI** means new positions are being opened: fresh money and fresh leverage.
- **Falling OI** means positions are being closed or liquidated.

## Reading them together with price

| Price | Open interest | Funding | What it often means |
|---|---|---|---|
| Rising | Rising | Moderately positive | Healthy uptrend with new longs |
| Rising | Falling | Falling | Shorts closing: a short squeeze or weak rally |
| Falling | Rising | Negative | New shorts piling in, possible squeeze later |
| Falling | Falling | Falling | Longs closing or being liquidated |
| Flat | Rising fast | Very positive | Crowded longs, risk of a sharp drop |

## Squeezes

When too many traders lean the same way with leverage, a small move against them can trigger a chain of liquidations.

- A **long squeeze** happens when funding is very positive and OI is high. A drop forces longs to sell, which pushes price lower, which liquidates more longs.
- A **short squeeze** is the mirror: very negative funding and rising OI, then a pop higher forces shorts to buy back.

Extreme funding is not a timing signal by itself; crowded trades can stay crowded for days. But it tells you which side has more to lose, and that is where the violent move usually comes from.

## Practical ways to use funding and OI

- **Avoid chasing.** If price is up 15% in a day with funding at extreme highs and OI surging, the late longs are the fuel for the next drop.
- **Confirm breakouts.** A breakout with steadily rising OI and calm funding is healthier than one with spiking funding.
- **Spot capitulation.** A sharp drop with collapsing OI often flushes out leverage and can mark a local low.
- **Mind your costs.** If you hold leveraged positions for days, add expected funding to your plan.

[[tool:liquidation-price-calculator]]

## Funding and OI in Alice

The Funding and Open Interest tracker in the Alice app lists the current funding rate, the next funding time, open interest in dollars and its 24-hour change for the biggest perpetual markets, so you can see at a glance where positioning is stretched. The futures section of each coin's analysis shows the same data next to the chart.

[[app]]

## Frequently asked questions

### Is a positive funding rate bullish?

Moderately positive funding shows bullish demand. Very high funding shows a crowded long trade, which raises the risk of a sharp drop.

### How often is funding paid?

On many large exchanges every 8 hours, but some contracts use 4-hour or 1-hour intervals. Check the contract details on your exchange.

### Do I pay funding on spot trades?

No. Funding only applies to perpetual futures positions that are open at the funding time.
