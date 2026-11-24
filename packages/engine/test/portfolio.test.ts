import { describe, expect, it } from "vitest";
import { runBacktest } from "../src/portfolio";
import { computeMetrics } from "../src/metrics";
import type { Candle } from "../src/types";
import { bar, flat, smallConfig } from "./helpers";

/**
 * Golden path, worked by hand:
 * - 1h anchors at 3600, 7200, 10800 (the first closed bar ends at 900).
 * - 3600: ref 100, buy 10 @ 99.98 (bar 3600 trades to 99.9). Fee 10 bps = 0.9998.
 * - 7200: ref 110, sell 10 @ 110.022 (bar 7200 trades to 111). Fee = 1.10022.
 * - Cash after the buy = 1000 - 999.8 - 0.9998 = -0.7998: sizing uses the whole
 *   sleeve, so the fee runs cash a hair below zero (at most feeBps of the sleeve).
 * - Round-trip PnL = 1100.22 - 999.8 - 2.10002 = 98.31998, final equity 1098.31998.
 */
function goldenCandles(): Candle[] {
  const c: Candle[] = [flat(0, 100), flat(900, 100), flat(1800, 100), flat(2700, 100)];
  c.push(bar(3600, 100, 100, 99.9, 100), flat(4500, 100), flat(5400, 100), bar(6300, 100, 110, 100, 110));
  c.push(bar(7200, 110, 111, 110, 111));
  for (let t = 8100; t <= 13500; t += 900) c.push(flat(t, 111));
  return c;
}

describe("runBacktest", () => {
  it("matches the hand-worked golden path exactly", () => {
    const signals = [
      { t: 0, asset: "X", target: 1 },
      { t: 7200, asset: "X", target: 0 },
    ];
    const r = runBacktest({ X: goldenCandles() }, signals, smallConfig());

    expect(r.equity.map((p) => p.t)).toEqual([3600, 7200, 10800, 14400]);
    expect(r.equity[0]!.equity).toBeCloseTo(1000, 9);
    expect(r.equity[1]!.equity).toBeCloseTo(-0.7998 + 1100, 9);
    expect(r.equity[2]!.equity).toBeCloseTo(1098.31998, 9);
    expect(r.equity[3]!.equity).toBeCloseTo(1098.31998, 9);

    expect(r.orders).toHaveLength(2);
    expect(r.orders[0]).toMatchObject({ side: "buy", placedAt: 3600, reference: 100, status: "filled", filledAt: 3600 });
    expect(r.orders[0]!.limit).toBeCloseTo(99.98, 10);
    expect(r.orders[1]).toMatchObject({ side: "sell", placedAt: 7200, reference: 110, status: "filled", filledAt: 7200 });

    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]!.direction).toBe("long");
    expect(r.trades[0]!.pnl).toBeCloseTo(98.31998, 9);
    expect(r.trades[0]!.entry).toBeCloseTo(99.98, 10);
    expect(r.trades[0]!.exit).toBeCloseTo(110.022, 10);

    const m = computeMetrics(r);
    expect(m.totalReturn).toBeCloseTo(0.09831998, 9);
    expect(m.trades).toBe(1);
    expect(m.winRate).toBe(1);
    expect(m.fillRate).toBe(1);
    expect(m.fees).toBeCloseTo(0.9998 + 1.10022, 9);
  });

  it("never chases: an unfilled order is cancelled and placed again at the next anchor", () => {
    const c: Candle[] = [];
    for (let t = 0; t <= 9900; t += 900) c.push(flat(t, 100));
    c[8] = bar(7200, 100, 100, 99.5, 100);
    const r = runBacktest({ X: c }, [{ t: 0, asset: "X", target: 1 }], smallConfig());
    expect(r.orders.map((o) => [o.placedAt, o.status])).toEqual([
      [3600, "cancelled"],
      [7200, "filled"],
    ]);
    expect(computeMetrics(r).fillRate).toBe(0.5);
  });

  it("does not use a signal before the anchor at or after its timestamp", () => {
    const c: Candle[] = [];
    for (let t = 0; t <= 9900; t += 900) c.push(bar(t, 100, 101, 99, 100));
    const r = runBacktest({ X: c }, [{ t: 3601, asset: "X", target: 1 }], smallConfig());
    expect(r.orders[0]!.placedAt).toBe(7200);
  });

  it("closes a long and opens a short when the target flips", () => {
    const c: Candle[] = [];
    for (let t = 0; t <= 13500; t += 900) c.push(bar(t, 100, 101, 99, 100));
    const signals = [
      { t: 0, asset: "X", target: 1 },
      { t: 7200, asset: "X", target: -1 },
    ];
    const r = runBacktest({ X: c }, signals, smallConfig({ feeBps: 0 }));
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]!.direction).toBe("long");
    expect(r.orders[1]!.qty).toBeCloseTo(20, 1);
    const last = r.equity[r.equity.length - 1]!;
    expect(last.equity).toBeGreaterThan(0);
  });

  it("runs sleeves independently with their weights", () => {
    const a: Candle[] = [];
    const b: Candle[] = [];
    for (let t = 0; t <= 9900; t += 900) {
      a.push(flat(t, 100));
      b.push(flat(t, 50));
    }
    const r = runBacktest({ A: a, B: b }, [], smallConfig({ weights: { A: 0.7, B: 0.3 } }));
    expect(r.equity[0]!.sleeves).toEqual({ A: 700, B: 300 });
  });

  it("rejects weights that don't sum to 1", () => {
    expect(() => runBacktest({ X: [flat(0, 1)] }, [], smallConfig({ weights: { X: 0.5 } }))).toThrow(/sum to 1/);
  });
});
