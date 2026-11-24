import type { BacktestConfig, Candle } from "../src/types";

export const bar = (t: number, o: number, h: number, l: number, c: number): Candle => ({ t, o, h, l, c, v: 1 });
export const flat = (t: number, p: number): Candle => bar(t, p, p, p, p);

/** Hourly decisions on 15m bars keep golden cases small. */
export const smallConfig = (over: Partial<BacktestConfig> = {}): BacktestConfig => ({
  initialCapital: 1000,
  weights: { X: 1 },
  limitOffsetBps: 2,
  intervalSeconds: 3600,
  candleSeconds: 900,
  feeBps: 10,
  fillRule: "through",
  minTradeFraction: 0.001,
  ...over,
});
