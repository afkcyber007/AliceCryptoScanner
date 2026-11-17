---
title: How to Backtest an EA in MT4 and MT5 (Step by Step)
description: How to backtest a forex or gold expert advisor in the MT4 and MT5 Strategy Tester, which settings matter, and how to read profit factor, drawdown and win rate like a pro.
date: 2026-11-17
category: strategy
keywords: how to backtest an ea, mt4 strategy tester, mt5 strategy tester, backtest expert advisor, ea backtest, profit factor, drawdown, modelling quality
tools: position-size-calculator, compound-calculator
---
Before you let a **trading robot (EA)** trade real money, you want to know how it behaved in the past. That is what a **backtest** does: MetaTrader replays years of price data and lets the EA trade it as if it were live. Here is how to run one properly in MT4 and MT5, and how to read the report.

## Step 1: Get good price data

A backtest is only as good as its data. MT4 downloads limited history by default, and missing bars create fake results.

- In **MT4**, open *Tools → History Center*, pick the pair and download the M1 data. For serious tests, traders use tick-data tools that import real tick history.
- In **MT5**, choose *Every tick based on real ticks* in the Strategy Tester. MT5 downloads real tick data from your broker automatically.

## Step 2: Set up the Strategy Tester

Open the tester with **Ctrl+R** (or *View → Strategy Tester*) and choose:

1. **Expert Advisor:** the EA you want to test.
2. **Symbol:** the pair it was built for, for example EUR/USD or XAU/USD.
3. **Model:** *Every tick* (MT4) or *Every tick based on real ticks* (MT5). "Open prices only" is fast but far less accurate for short-term robots.
4. **Period:** the timeframe the EA expects.
5. **Date range:** at least two years, ideally including both trending and ranging markets.
6. **Spread:** a realistic fixed spread (for example 2 points on EUR/USD) or the current spread.
7. **Deposit and leverage:** the balance and leverage you plan to trade with.

## Step 3: Read the report

After the test, open the **Report** and **Graph** tabs. These are the numbers that matter:

| Figure | What it means | What to look for |
|---|---|---|
| Total net profit | Money made after all losses | Positive, and large compared to the drawdown |
| Profit factor | Gross profit ÷ gross loss | Above 1.5 is good, above 3 is very strong |
| Maximal drawdown | Biggest fall from a peak | A level you could live with in real money |
| Profit trades (%) | Win rate | Read it together with average win and loss |
| Consecutive losses | Longest losing streak | Small numbers mean steadier results |
| Total trades | Number of trades | 200+ trades for a meaningful sample |

The **equity curve** on the Graph tab should rise steadily from left to right. Long flat periods or sharp drops show when the EA struggles.

## Example: a strong forex EA backtest

Our own [forex automatic trading robot](site:trading-robots/forex-ea/) was tested on EUR/USD M1 with every-tick modelling and a spread of 2:

| Result | Value |
|---|---|
| Total trades | 645 |
| Winning trades | 633 (98.14%) |
| Profit factor | 19.33 |
| Net profit on a 10,000 deposit | 249,091.95 |
| Maximal drawdown | 16.47% |
| Max consecutive losses | 3 |

The profit factor and win rate are excellent. The drawdown tells you how much patience the robot needs, and the larger average loss tells you never to remove its stop loss. Reading both sides is what a good backtest review looks like.

## Step 4: Check for the classic traps

- **Over-optimisation (curve fitting).** Settings tuned to fit the past perfectly often fail later. Test on a period the EA was not optimised on.
- **Unrealistic spread or no slippage.** Test with a higher spread too; good robots survive it.
- **Martingale or grid without a stop loss.** The curve looks smooth until one bad day wipes out the account. Look at the largest losing trade.
- **Too few trades.** Ten great trades prove nothing.

## Step 5: Forward test on demo, then go live small

A backtest is the first filter, not the final proof. Run the EA on a demo or small live account for a few weeks, compare the results with the backtest, then increase the lot size step by step. Put the EA on a [VPS](site:learn/forex-vps-for-ea/) so it never misses a trade.

[[tg:robot]]

## Frequently asked questions

### What is a good profit factor for an EA?
Above 1.5 is good and above 2 is strong for most systems. Very high profit factors usually come with a very high win rate, so also check the size of the average losing trade.

### What modelling quality should I use in MT4?
Use "Every tick" with complete M1 data, or imported tick data for the highest accuracy. In MT5, use "Every tick based on real ticks".

### How long should a backtest be?
At least two years and 200 trades, covering both trending and ranging markets.

### Is a backtest the same as live results?
No. Live trading adds real spreads, slippage and execution delays. Always forward test before trading larger size.
