import { describe, expect, it } from "vitest";
import { buyAndHold } from "../src/strategies/buy-and-hold";
import { coinFlip } from "../src/strategies/coin-flip";
import { smaCross } from "../src/strategies/sma-cross";
import { externalSignals, parseSignalFile } from "../src/adapters/json-signals";
import type { Candle } from "../src/types";
import { flat, smallConfig } from "./helpers";

const cfg = smallConfig();
const anchors = [3600, 7200, 10800, 14400];

describe("strategies", () => {
  it("buy-and-hold goes long once at the first anchor", () => {
    expect(buyAndHold.signals({ candles: {}, anchors, config: cfg })).toEqual([{ t: 3600, asset: "X", target: 1 }]);
  });

  it("coin flip is deterministic for a seed and only emits ±1", () => {
    const a = coinFlip(7).signals({ candles: {}, anchors, config: cfg });
    const b = coinFlip(7).signals({ candles: {}, anchors, config: cfg });
    expect(a).toEqual(b);
    expect(a.every((s) => s.target === 1 || s.target === -1)).toBe(true);
    expect(coinFlip(8).signals({ candles: {}, anchors, config: cfg })).not.toEqual(a);
  });

  it("SMA cross goes long in an uptrend and flat in a downtrend, emitting only changes", () => {
    const c: Candle[] = [];
    const prices = [10, 10, 10, 11, 12, 13, 14, 13, 11, 9, 7, 5];
    prices.forEach((p, i) => c.push(flat(i * 3600, p)));
    const as = prices.map((_, i) => (i + 1) * 3600);
    const s = smaCross(2, 3).signals({ candles: { X: c }, anchors: as, config: cfg });
    expect(s.map((x) => x.target)).toEqual([0, 1, 0]);
  });
});

describe("JSON signal adapter", () => {
  it("maps nested records, text sides, ISO times and asset names", () => {
    const file = {
      result: {
        rows: [
          { time: "2026-01-01T04:00:00Z", sym: "XAUUSD", action: "BUY" },
          { time: "2026-01-01T08:00:00Z", sym: "BTC", action: "flat" },
        ],
      },
    };
    const s = parseSignalFile(file, {
      recordsPath: "result.rows",
      timeField: "time",
      timeUnit: "iso",
      assetField: "sym",
      assetMap: { XAUUSD: "PAXGUSD", BTC: "BTCUSD" },
      sideField: "action",
    });
    expect(s).toEqual([
      { t: Date.UTC(2026, 0, 1, 4) / 1000, asset: "PAXGUSD", target: 1 },
      { t: Date.UTC(2026, 0, 1, 8) / 1000, asset: "BTCUSD", target: 0 },
    ]);
  });

  it("reads numeric targets in milliseconds", () => {
    const s = parseSignalFile([{ ts: 3_600_000, w: -0.5 }], { timeField: "ts", timeUnit: "ms", asset: "X", targetField: "w" });
    expect(s).toEqual([{ t: 3600, asset: "X", target: -0.5 }]);
  });

  it("reports the index of a bad record", () => {
    expect(() =>
      parseSignalFile(
        [
          { t: 1, side: "buy" },
          { t: 2, side: "moon" },
        ],
        { timeField: "t", asset: "X", sideField: "side" },
      ),
    ).toThrow(/record 1: unknown side "moon"/);
    expect(() => parseSignalFile([{ t: 1, w: 2 }], { timeField: "t", asset: "X", targetField: "w" })).toThrow(/outside/);
  });

  it("drops signals for assets the run doesn't trade", () => {
    const st = externalSignals("ext", "External", [
      { t: 1, asset: "X", target: 1 },
      { t: 1, asset: "Y", target: 1 },
    ]);
    expect(st.signals({ candles: {}, anchors, config: cfg })).toEqual([{ t: 1, asset: "X", target: 1 }]);
  });
});
