import { limitPrice, simulateLimitOrder } from "./fill-model";
import { anchorsBetween, barsInWindow, lastCloseAt } from "./schedule";
import type { BacktestConfig, BacktestResult, Candle, EquityPoint, Order, Signal, Trade, UnixSeconds } from "./types";

interface OpenTrade {
  direction: "long" | "short";
  openedAt: UnixSeconds;
  entryValue: number;
  entryQty: number;
  exitValue: number;
  exitQty: number;
  fees: number;
  maxQty: number;
}

interface Sleeve {
  asset: string;
  cash: number;
  qty: number;
  open: OpenTrade | null;
}

const EPS = 1e-12;

function openTrade(direction: "long" | "short", t: UnixSeconds, qty: number, price: number, fee: number): OpenTrade {
  return { direction, openedAt: t, entryValue: qty * price, entryQty: qty, exitValue: 0, exitQty: 0, fees: fee, maxQty: qty };
}

function closeTrade(asset: string, tr: OpenTrade, t: UnixSeconds): Trade {
  const gross = tr.direction === "long" ? tr.exitValue - tr.entryValue : tr.entryValue - tr.exitValue;
  const pnl = gross - tr.fees;
  return {
    asset,
    direction: tr.direction,
    openedAt: tr.openedAt,
    closedAt: t,
    entry: tr.entryValue / tr.entryQty,
    exit: tr.exitValue / tr.exitQty,
    maxQty: tr.maxQty,
    pnl,
    ret: pnl / tr.entryValue,
  };
}

/**
 * Applies one fill to a sleeve's round-trip bookkeeping. Handles opening from
 * flat, adding, reducing, closing and flipping through zero in one order.
 * Returns any trade that closed.
 */
function bookFill(s: Sleeve, delta: number, price: number, fee: number, t: UnixSeconds): Trade[] {
  const closed: Trade[] = [];
  const before = s.qty;
  let after = before + delta;
  if (Math.abs(after) < EPS) after = 0;
  const size = Math.abs(delta);

  if (before === 0) {
    s.open = openTrade(delta > 0 ? "long" : "short", t, size, price, fee);
  } else if (Math.sign(delta) === Math.sign(before)) {
    const tr = s.open!;
    tr.entryValue += size * price;
    tr.entryQty += size;
    tr.fees += fee;
    tr.maxQty = Math.max(tr.maxQty, Math.abs(after));
  } else {
    const tr = s.open!;
    const closing = Math.min(size, Math.abs(before));
    const opening = size - closing;
    const closingFee = fee * (closing / size);
    tr.exitValue += closing * price;
    tr.exitQty += closing;
    tr.fees += closingFee;
    if (after === 0 || Math.sign(after) !== Math.sign(before)) {
      closed.push(closeTrade(s.asset, tr, t));
      s.open = opening > EPS ? openTrade(after > 0 ? "long" : "short", t, opening, price, fee - closingFee) : null;
    }
  }
  s.qty = after;
  return closed;
}

function groupSignals(signals: readonly Signal[]): Map<string, Signal[]> {
  const by = new Map<string, Signal[]>();
  for (const s of signals) {
    const list = by.get(s.asset) ?? [];
    list.push(s);
    by.set(s.asset, list);
  }
  for (const list of by.values()) list.sort((a, b) => a.t - b.t);
  return by;
}

/** Time range every asset has data for, and the anchors that have a complete decision window inside it. */
export function tradableAnchors(candles: Record<string, readonly Candle[]>, cfg: BacktestConfig): UnixSeconds[] {
  const assets = Object.keys(cfg.weights);
  let start = -Infinity;
  let end = Infinity;
  for (const a of assets) {
    const list = candles[a];
    if (!list || list.length === 0) throw new Error(`No candles for ${a}`);
    start = Math.max(start, list[0]!.t + cfg.candleSeconds);
    end = Math.min(end, list[list.length - 1]!.t + cfg.candleSeconds);
  }
  return anchorsBetween(start, end - cfg.intervalSeconds, cfg.intervalSeconds);
}

/**
 * Runs one backtest.
 *
 * At every anchor (each `intervalSeconds` on the UTC clock) and for each asset:
 *  1. the target is the latest signal with t <= anchor, so there's no look-ahead;
 *  2. the reference price is the last close fully known at the anchor;
 *  3. a limit order for the difference between target and current size is
 *     placed `limitOffsetBps` better than the reference;
 *  4. it fills on the first bar in [anchor, anchor + interval) that trades
 *     through the limit, or is cancelled at the window's end. It's never chased.
 *
 * Each asset runs as its own sleeve funded with its weight of the capital.
 * Sleeves aren't rebalanced against each other.
 */
export function runBacktest(candles: Record<string, readonly Candle[]>, signals: readonly Signal[], cfg: BacktestConfig): BacktestResult {
  const assets = Object.keys(cfg.weights);
  const weightSum = assets.reduce((s, a) => s + cfg.weights[a]!, 0);
  if (Math.abs(weightSum - 1) > 1e-9) throw new Error(`Weights must sum to 1, got ${weightSum}`);

  const anchors = tradableAnchors(candles, cfg);
  const bySignal = groupSignals(signals);
  const cursor = new Map<string, number>(assets.map((a) => [a, 0]));
  const target = new Map<string, number>(assets.map((a) => [a, 0]));
  const sleeves: Sleeve[] = assets.map((a) => ({ asset: a, cash: cfg.initialCapital * cfg.weights[a]!, qty: 0, open: null }));

  const equity: EquityPoint[] = [];
  const orders: Order[] = [];
  const trades: Trade[] = [];
  const exposure: { t: UnixSeconds; gross: number }[] = [];

  const mark = (t: UnixSeconds) => {
    const point: EquityPoint = { t, equity: 0, sleeves: {} };
    let gross = 0;
    for (const s of sleeves) {
      const px = lastCloseAt(candles[s.asset]!, t, cfg.candleSeconds) ?? 0;
      const eq = s.cash + s.qty * px;
      point.sleeves[s.asset] = eq;
      point.equity += eq;
      gross += Math.abs(s.qty * px);
    }
    equity.push(point);
    exposure.push({ t, gross: point.equity > 0 ? gross / point.equity : 0 });
    return point;
  };

  for (const T of anchors) {
    const point = mark(T);

    for (const s of sleeves) {
      const list = bySignal.get(s.asset) ?? [];
      let i = cursor.get(s.asset)!;
      while (i < list.length && list[i]!.t <= T) {
        target.set(s.asset, list[i]!.target);
        i++;
      }
      cursor.set(s.asset, i);

      const ref = lastCloseAt(candles[s.asset]!, T, cfg.candleSeconds);
      const sleeveEq = point.sleeves[s.asset]!;
      if (ref === undefined || sleeveEq <= 0) continue;

      const desired = (target.get(s.asset)! * sleeveEq) / ref;
      const delta = desired - s.qty;
      if (Math.abs(delta) * ref < cfg.minTradeFraction * sleeveEq) continue;

      const side = delta > 0 ? "buy" : "sell";
      const limit = limitPrice(side, ref, cfg.limitOffsetBps);
      const bars = barsInWindow(candles[s.asset]!, T, T + cfg.intervalSeconds);
      const fill = simulateLimitOrder(side, limit, bars, cfg.fillRule);
      const order: Order = { asset: s.asset, side, placedAt: T, reference: ref, limit, qty: Math.abs(delta), status: fill.filled ? "filled" : "cancelled" };

      if (fill.filled) {
        const fee = (Math.abs(delta) * limit * cfg.feeBps) / 10_000;
        s.cash -= delta * limit + fee;
        trades.push(...bookFill(s, delta, limit, fee, fill.at!));
        order.filledAt = fill.at;
        order.fee = fee;
      }
      orders.push(order);
    }
  }

  const last = anchors[anchors.length - 1];
  if (last !== undefined) mark(last + cfg.intervalSeconds);

  return { config: cfg, equity, orders, trades, exposure };
}
