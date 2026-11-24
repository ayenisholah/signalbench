import type { Candle, FillRule, Side, UnixSeconds } from "./types";

/** Limit price for an order offset from the reference: buys sit below it, sells above it. */
export function limitPrice(side: Side, reference: number, offsetBps: number): number {
  const k = offsetBps / 10_000;
  return side === "buy" ? reference * (1 - k) : reference * (1 + k);
}

/** Whether one bar fills a resting limit order under the given rule. */
export function barFills(side: Side, limit: number, bar: Candle, rule: FillRule): boolean {
  if (side === "buy") return rule === "through" ? bar.l < limit : bar.l <= limit;
  return rule === "through" ? bar.h > limit : bar.h >= limit;
}

export interface FillResult {
  filled: boolean;
  /** Open time of the bar that filled the order. */
  at?: UnixSeconds;
  /** Fill price. Always the limit: no price improvement is assumed, even on a gap. */
  price?: number;
}

/**
 * Walks the bars of one decision window in time order and returns the first
 * fill. If nothing fills, the order is cancelled at the end of the window and
 * is never chased to a worse price. Fills are all-or-nothing.
 */
export function simulateLimitOrder(side: Side, limit: number, windowBars: readonly Candle[], rule: FillRule): FillResult {
  for (const bar of windowBars) {
    if (barFills(side, limit, bar, rule)) return { filled: true, at: bar.t, price: limit };
  }
  return { filled: false };
}
