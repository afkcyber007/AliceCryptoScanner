---
title: ATR Indicator Explained: Volatility, Stop Loss and Position Size
description: What the Average True Range (ATR) measures, how to read it, and how to use ATR for stop losses, take-profit targets and position sizing in forex, gold and crypto.
date: 2026-11-20
category: strategy
keywords: atr indicator, average true range, atr stop loss, atr trailing stop, volatility indicator, atr position size
tools: position-size-calculator, risk-reward-calculator
---
Most stop losses are hit not because the idea was wrong but because the stop was too tight for how much the market normally moves. The Average True Range (ATR) fixes that. It measures volatility, so your stops and targets fit the market you trade.

## What ATR measures

ATR, created by J. Welles Wilder, is the average size of a candle's full range over a number of periods, usually 14. The "true range" of a candle is the largest of:

- today's high minus today's low,
- today's high minus yesterday's close,
- yesterday's close minus today's low.

<span class="formula">ATR(14) = average of the last 14 true ranges</span>

ATR has no direction. A rising ATR means the market moves more, a falling ATR means it moves less.

## Reading ATR

- On the 4-hour chart of gold, an ATR of $18 means a typical 4-hour candle covers about $18.
- When ATR doubles after a quiet period, a breakout is often underway.
- Very low ATR often comes before a big move. Volatility contracts, then expands.

## ATR stop loss

A common rule is to place the stop **1.5 to 2 times ATR** away from the entry, beyond the nearest swing:

<span class="formula">Stop distance = 1.5 × ATR</span>

On a pair with ATR(14) of 20 pips on the 1-hour chart, a 30 to 40 pip stop gives the trade room to breathe. A 10 pip stop would likely be hit by normal noise.

## ATR targets and trailing stops

- **Targets:** TP1 at 1 × ATR, TP2 at 2 × ATR, TP3 at 3 × ATR from the entry is a simple ladder.
- **Trailing stop (chandelier):** after TP2, trail the stop 2 × ATR below the highest high since the entry on a long.

## ATR and position size

Because the stop distance comes from ATR, the position size must adapt. A wider stop means a smaller position, so your risk in dollars stays the same.

[[tool:position-size-calculator]]

## ATR in Alice

The Alice Gold and BTC deep analysis shows the average 4-hour range (ATR) next to every trade plan, and the VIP rooms use ATR-based stops and targets on every signal.

[[cta:strategy]]

## Frequently asked questions

### What is a good ATR setting?

The default of 14 periods works for most traders. Shorter settings react faster, longer settings are smoother.

### How do I use ATR for stop loss?

Place the stop 1.5 to 2 times the ATR from your entry, beyond the nearest swing high or low, then size the position so that distance equals your planned risk.

### Does ATR show trend direction?

No. ATR only measures how much the market moves. Use moving averages or market structure for direction.

### Is high ATR good or bad?

Neither. High ATR means bigger moves and bigger stops. Reduce position size when ATR is high so your risk stays the same.
