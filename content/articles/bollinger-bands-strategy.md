---
title: Bollinger Bands Strategy: Squeeze, Breakout and Mean Reversion
description: How Bollinger Bands work, what the squeeze tells you, how to trade breakouts and mean reversion, and how to avoid the most common Bollinger Band mistakes.
date: 2026-10-01
category: strategy
keywords: bollinger bands, bollinger band squeeze, bollinger bands strategy, mean reversion, volatility breakout, bollinger band settings
tools: risk-reward-calculator, position-size-calculator
---
Bollinger Bands measure volatility. They expand when the market is moving fast and contract when it goes quiet. That simple behaviour gives you two very different ways to trade: catching the breakout after a quiet period, and fading stretched moves back to the average.

![Bollinger Bands squeeze followed by a breakout](img:art/bollinger.webp "The bands narrow during a quiet period (the squeeze), then expand as price breaks out.")

## How the bands are calculated

With the standard settings (20, 2):

- **Middle band:** the 20-period simple moving average.
- **Upper band:** the middle band plus 2 standard deviations.
- **Lower band:** the middle band minus 2 standard deviations.

About 90% of closing prices fall inside the bands, so a close outside them is a significant event.

## The squeeze

Volatility moves in cycles: quiet periods are followed by explosive ones. When the bands become unusually narrow, the market is coiling. The **squeeze** does not tell you the direction, but it warns that a large move is likely.

### Trading the squeeze breakout

1. Find bands at their narrowest in weeks.
2. Mark the range high and low during the squeeze.
3. Enter when a candle closes outside the range with expanding bands and rising volume.
4. Stop on the other side of the range; target at least 2R or a trail along the middle band.

## Riding the bands in a trend

In a strong uptrend, price can "walk" along the upper band for many candles. Touching the upper band is not a sell signal in this case. Pullbacks to the middle band often offer trend-following entries.

## Mean reversion in ranges

When the bands are flat and the market is ranging, price that closes outside a band often returns to the middle band. Traders sell near the upper band and buy near the lower band, targeting the middle. This only works in ranges. In trends it is a quick way to fight the market.

[[tool:risk-reward-calculator]]

## Combining bands with other tools

- **RSI:** a lower-band touch with RSI below 30 and bullish divergence is a stronger mean-reversion signal.
- **Support and resistance:** a band touch at a major level carries more weight than one in the middle of nowhere.
- **Higher-timeframe trend:** take only the band signals that agree with the bigger trend.

## Mistakes to avoid

- Selling every upper-band touch in an uptrend.
- Trading the squeeze before the breakout is confirmed.
- Ignoring position size because the setup "looks certain".

[[tool:position-size-calculator]]

## Volatility in Alice

Alice shows the ATR and its percentage for every market, flags volume spikes and breakouts, and shows the busiest and quietest hours for crypto. Low volatility followed by a breakout signal is a classic squeeze.

[[app]]

## Frequently asked questions

### What are the best Bollinger Band settings?

The default 20 and 2 suits most timeframes. Some short-term traders use 20 and 2.5 to reduce false signals.

### Is a close outside the band a reversal signal?

Not by itself. In a trend it shows strength. In a range it can signal a return to the middle. Context decides.

### Do Bollinger Bands work on crypto and gold?

Yes. Both markets have clear volatility cycles, which makes the squeeze especially useful.
