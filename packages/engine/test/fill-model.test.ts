import { describe, expect, it } from "vitest";
import { barFills, limitPrice, simulateLimitOrder } from "../src/fill-model";
import { bar } from "./helpers";

describe("fill model", () => {
  it("offsets buys below and sells above the reference by 2 bps", () => {
    expect(limitPrice("buy", 100, 2)).toBeCloseTo(99.98, 10);
    expect(limitPrice("sell", 100, 2)).toBeCloseTo(100.02, 10);
  });

  it("'through' needs price to trade past the limit; 'touch' accepts equality", () => {
    const b = bar(0, 100, 100, 99.98, 100);
    expect(barFills("buy", 99.98, b, "through")).toBe(false);
    expect(barFills("buy", 99.98, b, "touch")).toBe(true);
    const s = bar(0, 100, 100.02, 100, 100);
    expect(barFills("sell", 100.02, s, "through")).toBe(false);
    expect(barFills("sell", 100.02, s, "touch")).toBe(true);
  });

  it("fills on the first qualifying bar at the limit, with no price improvement", () => {
    const bars = [bar(0, 100, 100, 99.99, 100), bar(900, 99, 99, 95, 96), bar(1800, 90, 90, 80, 85)];
    expect(simulateLimitOrder("buy", 99.98, bars, "through")).toEqual({ filled: true, at: 900, price: 99.98 });
  });

  it("cancels when nothing in the window trades through", () => {
    const bars = [bar(0, 100, 101, 100, 100), bar(900, 100, 102, 99.99, 101)];
    expect(simulateLimitOrder("buy", 99.98, bars, "through")).toEqual({ filled: false });
  });
});
