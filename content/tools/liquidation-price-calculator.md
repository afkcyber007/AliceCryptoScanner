---
title: Liquidation Price Calculator for Crypto Futures (Free) | AliceCryptoScanner
description: Free liquidation price calculator for Bitcoin and crypto perpetual futures. Enter entry, leverage and maintenance margin to estimate where a long or short position is liquidated.
h1: Liquidation price calculator
intro: Estimate where a leveraged long or short crypto futures position would be liquidated, before you open it.
---
## What is a liquidation price?

On a futures exchange you only put up part of the position as **margin**. If the price moves against you far enough that your margin can no longer cover the loss plus the exchange's **maintenance margin**, the exchange closes the position for you. That level is the liquidation price, and on isolated margin you lose the whole margin of that position.

## The formula

For an isolated-margin, USDT-margined perpetual the estimate is:

<span class="formula">Long: Liquidation ≈ Entry × (1 − 1 ÷ Leverage + Maintenance margin)</span>
<span class="formula">Short: Liquidation ≈ Entry × (1 + 1 ÷ Leverage − Maintenance margin)</span>

At 10x leverage with a 0.5% maintenance margin, a long is liquidated after a drop of about 9.5%. At 50x it takes only about 1.5%.

| Leverage | Move that liquidates a long (0.5% MMR) |
|---|---|
| 3x | about 32.8% |
| 5x | about 19.5% |
| 10x | about 9.5% |
| 25x | about 3.5% |
| 50x | about 1.5% |

## Keep your stop far from it

The liquidation price is not a stop loss. Exchanges liquidate using the mark price and add a liquidation fee, so the real level is usually slightly closer than the estimate. Place your stop loss where your trade idea is wrong, and choose a leverage low enough that the stop is reached long before liquidation. Then use the [position size calculator](../position-size-calculator/) to set the size.

## Frequently asked questions

### What is maintenance margin?

The minimum margin the exchange requires to keep a position open, usually 0.4% to 1% of the position value on the largest coins and higher on small coins or very large positions.

### Is cross margin different?

Yes. On cross margin the whole account balance supports the position, so the liquidation price is further away, but a bad trade can take the whole balance with it. This calculator covers isolated margin.

### Why was I liquidated before my calculated price?

Exchanges use the mark price, charge fees and funding, and may apply higher maintenance margin on larger positions. Treat the result as an estimate and give yourself a wide buffer.
