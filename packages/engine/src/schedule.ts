import type { Candle, UnixSeconds } from "./types";

/** First anchor at or after `t`. Anchors are multiples of `interval` since the Unix epoch, so they line up with UTC. */
export function ceilToAnchor(t: UnixSeconds, interval: number): UnixSeconds {
  return Math.ceil(t / interval) * interval;
}

export function floorToAnchor(t: UnixSeconds, interval: number): UnixSeconds {
  return Math.floor(t / interval) * interval;
}

/**
 * Every anchor from the first one at or after `start` up to and including `end`.
 * With interval = 4h this gives 00:00, 04:00, … 20:00 UTC each day.
 */
export function anchorsBetween(start: UnixSeconds, end: UnixSeconds, interval: number): UnixSeconds[] {
  const out: UnixSeconds[] = [];
  for (let t = ceilToAnchor(start, interval); t <= end; t += interval) out.push(t);
  return out;
}

/** Index of the first candle with open time >= t, or candles.length. Candles must be sorted by t. */
export function lowerBound(candles: readonly Candle[], t: UnixSeconds): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid]!.t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The last close known at time `t`: the close of the latest bar that has fully
 * closed by `t` (open time + step <= t). Returns undefined if none has.
 */
export function lastCloseAt(candles: readonly Candle[], t: UnixSeconds, step: number): number | undefined {
  const i = lowerBound(candles, t - step + 1) - 1;
  return i >= 0 ? candles[i]!.c : undefined;
}

/** Bars whose open time falls in [from, to). */
export function barsInWindow(candles: readonly Candle[], from: UnixSeconds, to: UnixSeconds): Candle[] {
  const i = lowerBound(candles, from);
  const j = lowerBound(candles, to);
  return candles.slice(i, j);
}
