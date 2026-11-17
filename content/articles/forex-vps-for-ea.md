---
title: Best VPS for Forex Robots (EA): How to Run MT4/MT5 24/5
description: Why a forex trading robot needs a VPS, what specs and location to choose, how to install MT4 or MT5 on a Windows VPS and keep your EA running 24/5 without your computer.
date: 2026-11-16
category: forex
keywords: forex vps, vps for ea, mt4 vps, mt5 vps, best vps for forex robot, run ea 24/5, windows vps trading
tools: position-size-calculator, forex-market-hours
---
A **trading robot (EA)** only trades while MetaTrader is open and online. If your laptop sleeps, restarts for an update or loses Wi-Fi, the robot stops, and an open trade is left without management. A **forex VPS** solves that: it is a small Windows computer in a data centre that runs MetaTrader 24 hours a day.

## Why every EA needs a VPS

- **24/5 uptime.** The robot never misses a setup because your computer was off.
- **Faster execution.** A VPS near your broker's server cuts the delay to 1 to 5 milliseconds, which means less slippage.
- **Stable internet and power.** Data centres have backup power and connections.
- **Trade from anywhere.** Watch the trades from the MetaTrader app on your phone while the VPS does the work.

## What VPS specs do you need?

| Setup | RAM | CPU | Disk |
|---|---|---|---|
| 1 to 2 MT4/MT5 terminals | 2 GB | 1 to 2 cores | 30 GB SSD |
| 3 to 5 terminals | 4 GB | 2 cores | 50 GB SSD |
| 6+ terminals or heavy EAs | 8 GB | 4 cores | 80 GB SSD |

Choose **Windows Server**, because MetaTrader is a Windows program.

## Choose the right location

Pick a data centre close to your broker's trading server. Most brokers host in **London (LD4)**, **New York (NY4)** or **Amsterdam**. Ask your broker, or check the server ping in MetaTrader (bottom right corner) after you log in from the VPS.

Some brokers, including [IC Markets](site:best-forex-crypto-exchanges/#icmarkets), offer a free VPS when you trade a minimum volume each month. MetaTrader also offers a built-in "MQL5 VPS" for a small monthly fee.

## How to set up MT4 or MT5 on a VPS

1. **Buy the VPS** and note the IP address, user name and password.
2. **Connect** with Remote Desktop (Windows) or the Microsoft Remote Desktop app (Mac, phone).
3. **Download MetaTrader** from your broker's website inside the VPS and log in to your trading account.
4. **Install the EA:** *File → Open Data Folder → MQL4 (or MQL5) → Experts*, paste the EA file and restart MetaTrader.
5. **Attach the EA** to the right chart, allow algo trading and press the **AutoTrading** button so it turns green.
6. **Disconnect** from Remote Desktop (do not log off). MetaTrader keeps running.

## Keep the robot healthy

- Turn off automatic Windows restarts during market hours.
- Check the **Experts** and **Journal** tabs once a day for errors.
- Restart MetaTrader once a week, on the weekend, when the market is closed.
- Keep only the terminals you need, so the VPS never runs out of memory.

[[tg:robot]]

## Frequently asked questions

### Do I really need a VPS for an EA?
If you want the robot to trade 24/5, yes. A home computer can work, but sleep mode, updates and internet drops will stop it.

### How much does a forex VPS cost?
Usually 10 to 30 USD a month for 1 to 4 terminals. Some brokers give a VPS free to active traders.

### Can I run several EAs on one VPS?
Yes. Use one MetaTrader terminal per account and attach each EA to its own chart. Give the VPS enough RAM.

### Will closing Remote Desktop stop the EA?
No, as long as you close the window (disconnect) and do not sign out of Windows.
