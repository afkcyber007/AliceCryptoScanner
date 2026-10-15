---
title: Leverage and Margin Explained: How They Work and How Not to Get Liquidated
description: What leverage and margin really are in forex and crypto, how margin calls and liquidation work, the leverage limits regulators set, and how to use leverage safely.
date: 2026-10-15
category: basics
keywords: leverage explained, margin trading, margin call, liquidation, forex leverage, crypto leverage
tools: margin-calculator, liquidation-price-calculator, position-size-calculator
---
Leverage is the reason a trader with $1,000 can control a $100,000 position, and also the reason many new traders lose their account in a week. Leverage itself is not good or bad. Misunderstanding it is what hurts. This guide explains how it really works.

## What leverage is

Leverage lets you open a position larger than the money in your account. Your broker or exchange holds part of your balance as a deposit, called **margin**, and lends you the rest.

<span class="formula">Margin = Position value ÷ Leverage</span>

With 1:100 leverage, a $100,000 EUR/USD position needs $1,000 of margin. With 1:10, it needs $10,000.

[[tool:margin-calculator]]

## The most important point: leverage does not set your risk

Your profit or loss depends on the **position size** and how far price moves, not on the leverage. A 0.5-lot EUR/USD trade gains or loses $5 per pip whether your account is set to 1:30 or 1:500. Leverage only decides how much margin is locked up.

The danger is that high leverage makes it easy to open a position far too big for your account. If you size every trade from your stop loss and a fixed risk percentage, leverage becomes a background setting.

[[tool:position-size-calculator]]

## Margin level, margin calls and stop-outs

Your broker constantly compares your **equity** (balance plus open profit or loss) with your **used margin**:

<span class="formula">Margin level = Equity ÷ Used margin × 100%</span>

- When the margin level falls to the **margin call** level, often 100%, you cannot open new trades.
- If it keeps falling to the **stop-out** level, often 50% or lower, the broker starts closing your positions, largest loss first.

Keeping your used margin small compared with your equity keeps you far from both.

## Liquidation in crypto futures

On crypto exchanges each futures position has its own **liquidation price**. On isolated margin, if price reaches it, the exchange closes the position and you lose the margin you put up for it.

At 10x leverage a move of roughly 10% against you is enough to liquidate a position; at 50x, about 2%. Bitcoin can move that much in an hour. The higher the leverage, the less room your trade has to breathe.

[[tool:liquidation-price-calculator]]

## Leverage limits for retail traders

Many regulators limit leverage for retail clients. In the European Union, the limits set by ESMA are:

| Market | Maximum leverage |
|---|---|
| Major forex pairs | 30:1 |
| Other forex pairs, gold, major indices | 20:1 |
| Other commodities, minor indices | 10:1 |
| Individual stocks | 5:1 |
| Cryptocurrencies | 2:1 |

The UK and Australia have similar rules. Offshore brokers and crypto exchanges often offer much higher leverage, sometimes 100x or more. Higher available leverage does not mean you should use it.

## How to use leverage safely

1. **Size from the stop.** Decide your risk per trade first, then calculate the position size.
2. **Keep used margin low.** Many experienced traders keep total used margin well below half their equity.
3. **Know your liquidation price** on every crypto futures trade, and make sure your stop is far from it.
4. **Use isolated margin** for single trades in crypto, so one position cannot drain your whole account.
5. **Account for funding and swaps.** Holding leveraged positions overnight or for days has a cost.

## Frequently asked questions

### What leverage should a beginner use?

Leverage matters less than position size. If you size from your stop with 1% risk, a moderate leverage setting simply means less margin is locked up. On crypto futures, beginners are usually safest at 2x to 5x.

### Can I lose more than my deposit?

With regulated forex and CFD brokers in many regions, retail clients have negative balance protection. On some brokers and products you can lose more than you deposited. On crypto exchanges using isolated margin, your loss on a position is limited to its margin.

### Is 1:500 leverage dangerous?

The setting itself is not, but it makes it very easy to open a position far too large for your account. That is where the danger comes from.
