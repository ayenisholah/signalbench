import { z } from "zod";

/** Unix time in seconds (UTC). Every timestamp in the engine uses this unit. */
export type UnixSeconds = number;

/** One OHLCV bar. `t` is the bar's open time; the bar covers [t, t + step). */
export const CandleSchema = z.object({
  t: z.number().int().nonnegative(),
  o: z.number().positive(),
  h: z.number().positive(),
  l: z.number().positive(),
  c: z.number().positive(),
  v: z.number().nonnegative(),
});
export type Candle = z.infer<typeof CandleSchema>;

/**
 * A signal says what exposure a strategy wants in one asset from time `t` on.
 * `target` is the fraction of that asset's sleeve equity: 1 = fully long,
 * 0 = flat, -1 = fully short. A signal only becomes usable at the first
 * schedule anchor at or after `t`, so a strategy can never trade on the future.
 */
export const SignalSchema = z.object({
  t: z.number().int().nonnegative(),
  asset: z.string().min(1),
  target: z.number().min(-1).max(1),
});
export type Signal = z.infer<typeof SignalSchema>;

export type Side = "buy" | "sell";

/** How a resting limit order is judged filled against a bar. */
export type FillRule =
  /** Price must trade strictly through the limit (low < limit for a buy). Conservative default. */
  | "through"
  /** Touching the limit is enough (low <= limit for a buy). Optimistic. */
  | "touch";

export interface BacktestConfig {
  /** Starting capital in quote currency (USD). */
  initialCapital: number;
  /** Sleeve weights per asset; must sum to 1. e.g. { PAXGUSD: 0.7, BTCUSD: 0.3 }. */
  weights: Record<string, number>;
  /** Limit offset from the reference price, in basis points (2 = 0.02%). */
  limitOffsetBps: number;
  /** Decision interval in seconds; anchors sit on multiples of this in UTC. */
  intervalSeconds: number;
  /** Candle step in seconds (900 for 15m bars). */
  candleSeconds: number;
  /** Maker fee charged on filled notional, in basis points. */
  feeBps: number;
  fillRule: FillRule;
  /** Orders smaller than this fraction of sleeve equity are skipped. */
  minTradeFraction: number;
}

export const DEFAULT_CONFIG: BacktestConfig = {
  initialCapital: 100_000,
  weights: { PAXGUSD: 0.7, BTCUSD: 0.3 },
  limitOffsetBps: 2,
  intervalSeconds: 4 * 60 * 60,
  candleSeconds: 15 * 60,
  feeBps: 5,
  fillRule: "through",
  minTradeFraction: 0.001,
};

export type OrderStatus = "filled" | "cancelled";

/** A limit order placed at an anchor and either filled inside its window or cancelled at the window's end. */
export interface Order {
  asset: string;
  side: Side;
  /** Anchor time the order was placed. */
  placedAt: UnixSeconds;
  /** Last close at or before the anchor; the limit is offset from this. */
  reference: number;
  limit: number;
  qty: number;
  status: OrderStatus;
  /** Open time of the bar that filled it. */
  filledAt?: UnixSeconds;
  fee?: number;
}

/** A round trip: a position opened from flat and later closed back to flat (or flipped). */
export interface Trade {
  asset: string;
  direction: "long" | "short";
  openedAt: UnixSeconds;
  closedAt: UnixSeconds;
  /** Average entry price, weighted by size added. */
  entry: number;
  /** Average exit price, weighted by size removed. */
  exit: number;
  /** Largest absolute size held during the trade. */
  maxQty: number;
  /** Realised PnL after fees, in quote currency. */
  pnl: number;
  /** pnl divided by the largest notional committed. */
  ret: number;
}

export interface EquityPoint {
  t: UnixSeconds;
  equity: number;
  /** Equity per asset sleeve, same keys as config.weights. */
  sleeves: Record<string, number>;
}

export interface Metrics {
  start: UnixSeconds;
  end: UnixSeconds;
  days: number;
  totalReturn: number;
  cagr: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  maxDrawdownDays: number;
  volatility: number;
  trades: number;
  winRate: number;
  ordersPlaced: number;
  fillRate: number;
  turnover: number;
  exposure: number;
  fees: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  equity: EquityPoint[];
  orders: Order[];
  trades: Trade[];
  /** Gross exposure (|position notional| / equity) per anchor, averaged across sleeves by weight. */
  exposure: { t: UnixSeconds; gross: number }[];
}
