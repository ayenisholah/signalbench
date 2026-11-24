import type { BacktestConfig, Candle, Signal, UnixSeconds } from "../types";

export interface StrategyContext {
  candles: Record<string, readonly Candle[]>;
  /** Decision anchors the engine will use, in order. */
  anchors: readonly UnixSeconds[];
  config: BacktestConfig;
}

/**
 * A strategy turns market history into signals. It must only use data known
 * at each anchor; the engine also guards this by applying a signal only from
 * the first anchor at or after its timestamp.
 */
export interface Strategy {
  id: string;
  name: string;
  description: string;
  signals(ctx: StrategyContext): Signal[];
}
