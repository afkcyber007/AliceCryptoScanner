---
title: Forex Automatic Trading Robot / EA (MT4/MT5) + Backtest
description: Alice forex automatic trading robot (EA) for MT4 and MT5. EUR/USD backtest: 645 trades, 98.14% winning trades, profit factor 19.33. Weekly live results and setup help.
h1: Forex Automatic Trading Robot / EA
intro: A forex expert advisor for MetaTrader 4 and 5 that trades EUR/USD for you around the clock. See the full backtest, the weekly live results and how to start.
keywords: forex automatic trading robot, forex ea, forex robot mt4, forex robot mt5, best forex ea, eurusd ea, automated forex trading, expert advisor
market: forex
---
## What the Alice forex EA does

The **Alice forex automatic trading robot** is an expert advisor (EA) for MetaTrader 4 and MetaTrader 5. It watches EUR/USD on every tick, opens a trade only when its conditions line up, places the stop loss and take profit automatically and closes the trade by its rules. You do not need to watch the chart: once the EA is running on a VPS it trades **24 hours a day, five days a week**.

- **Market:** EUR/USD, the most liquid currency pair in the world, with the lowest spreads.
- **Platforms:** MT4 and MT5, any broker that allows expert advisors.
- **Style:** short-term trades with a very high share of winning trades.
- **Lot size:** grows with the balance (compounding), so the account can grow faster as profits build up. You choose the starting risk.

## Backtest results in plain words

The backtest above ran on **EUR/USD M1 data in MetaTrader 4 with "every tick" modelling**: 746,987 bars and over 66 million ticks, from a 10,000 deposit, with a spread of 2 points.

- **The balance grew from 10,000 to more than 259,000**, a total net profit of 249,091.95 (+2,491%).
- **633 of 645 trades closed in profit (98.14%).** Both buy trades (98.72% won) and sell trades (97.59% won) were profitable, so the robot is not tied to one direction of the market.
- **Profit factor of 19.33.** For every 1 lost, the robot made 19.33 in gross profit. Most professional systems run between 1.5 and 3.
- **Only 12 losing trades**, never more than 3 in a row, against a best streak of 187 winning trades in a row.
- **The equity curve rises smoothly** from left to right, with no large dips.

## How to read the risk figures honestly

A strong backtest is a good start, but every robot has risk, and we prefer to show it openly:

- **Maximal drawdown was 16.47%** (21,044.80) and the relative drawdown 29.56% at its deepest point. Plan for a drawdown of this size and use a starting lot you are comfortable with.
- **The average losing trade (-1,132) was larger than the average winning trade (+415).** The robot wins by being right very often, so you must never remove its stop loss.
- **Lot size grows with the balance**, which makes the curve steeper in a backtest. With a fixed lot size, profits grow in a straight line instead.
- **Backtests are not live trading.** Spreads, slippage and broker execution differ. That is why we post live results every week in the Telegram channel.

## How to start with the forex EA

1. **Join the robot channel** and look at the latest weekly results.
2. **Message our team** with the "Buy this robot" button. Tell us your balance and broker.
3. **Install the EA** on MT4 or MT5 with our step-by-step guide.
4. **Run it on a Windows VPS** close to your broker's server, so it trades 24/5 with fast execution.
5. **Start small**, check the results for a few weeks, then raise the lot size step by step.

Want to learn more first? Read our guides on [how to choose a forex trading robot](site:learn/forex-trading-robots-expert-advisors/), [how to backtest an EA in MT4 and MT5](site:learn/how-to-backtest-an-ea-mt4-mt5/) and [the best VPS for forex robots](site:learn/forex-vps-for-ea/).

## Frequently asked questions

### What is the best forex EA for MT4?
Look for an EA with a long tick-data backtest, a high profit factor, a drawdown you can live with and live results you can check. The Alice forex EA shows a profit factor of 19.33 and 98.14% winning trades over 645 backtest trades, and we post live results every week.

### Which currency pair does the forex robot trade?
EUR/USD. It is the most liquid forex pair with the tightest spreads, which matters for a robot that takes many short trades.

### How much money do I need to start?
It depends on your broker and the lot size. Many traders start with a small cent or standard account and raise the lot as the balance grows. Message our team with your balance and we will suggest a safe starting setting.

### Can I run the forex EA on my phone?
No. Expert advisors run on MetaTrader for Windows. For 24/5 trading we recommend a Windows VPS. You can still follow the trades from the MetaTrader app on your phone.

### Is the backtest a guarantee of future profits?
No. A backtest shows how the rules performed on past data. Live results can be better or worse, and trading with leverage carries a high risk of loss. Always use money you can afford to risk.
