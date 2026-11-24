import { describe, expect, it } from "vitest";
import { dailyEquity, drawdownSeries, maxDrawdown, monthlyReturns, sharpe, sortino } from "../src/metrics";
import type { EquityPoint } from "../src/types";

const DAY = 86_400;
const pt = (t: number, equity: number): EquityPoint => ({ t, equity, sleeves: {} });

describe("metrics", () => {
  it("finds the deepest drawdown and the longest time underwater", () => {
    const eq = [pt(0, 100), pt(DAY, 120), pt(2 * DAY, 90), pt(3 * DAY, 100), pt(4 * DAY, 130), pt(5 * DAY, 117)];
    const dd = maxDrawdown(eq);
    expect(dd.depth).toBeCloseTo(-0.25, 12);
    expect(dd.days).toBe(2);
    expect(drawdownSeries(eq).map((d) => d.drawdown)[5]).toBeCloseTo(-0.1, 12);
  });

  it("Sharpe is zero with no variance and positive for a steady winner", () => {
    expect(sharpe([0.01, 0.01, 0.01])).toBe(0);
    expect(sharpe([0.01, 0.02, 0.0, 0.015])).toBeGreaterThan(0);
  });

  it("Sharpe matches the textbook formula", () => {
    const r = [0.01, -0.02, 0.03, 0.0];
    const m = 0.005;
    const sd = Math.sqrt((0.005 ** 2 + 0.025 ** 2 + 0.025 ** 2 + 0.005 ** 2) / 3);
    expect(sharpe(r)).toBeCloseTo((m / sd) * Math.sqrt(365), 10);
  });

  it("Sortino ignores upside volatility", () => {
    expect(sortino([0.01, 0.05, 0.02])).toBe(0);
    expect(sortino([0.02, -0.01, 0.02])).toBeGreaterThan(sharpe([0.02, -0.01, 0.02]));
  });

  it("dailyEquity samples midnight UTC and keeps the endpoints", () => {
    const eq = [pt(3600 * 4, 1), pt(DAY, 2), pt(DAY + 3600 * 4, 3), pt(2 * DAY, 4), pt(2 * DAY + 3600 * 8, 5)];
    expect(dailyEquity(eq).map((p) => p.equity)).toEqual([1, 2, 4, 5]);
  });

  it("chains monthly returns from the previous month's close", () => {
    const jan = Date.UTC(2026, 0, 1) / 1000;
    const feb = Date.UTC(2026, 1, 1) / 1000;
    const eq = [pt(jan, 100), pt(jan + 10 * DAY, 110), pt(feb, 121), pt(feb + 5 * DAY, 99)];
    const m = monthlyReturns(eq);
    expect(m.map((x) => x.month)).toEqual(["2026-01", "2026-02"]);
    expect(m[0]!.ret).toBeCloseTo(0.1, 12);
    expect(m[1]!.ret).toBeCloseTo(99 / 110 - 1, 12);
  });
});
