import type { BacktestConfig, Metrics, Trade } from "@signalbench/engine";

export type WindowKey = "30d" | "90d" | "1y" | "all";

/**
 * What the dashboard ships to the browser per run. Equity is packed as
 * [t, equity, drawdown, ...sleeveEquity in `assets` order] to keep the payload small.
 */
export interface DashRun {
  id: string;
  name: string;
  description: string;
  windows: Record<WindowKey, Metrics>;
  equity: number[][];
  monthly: { month: string; ret: number }[];
  recentTrades: Trade[];
}

export interface DashMarket {
  asset: string;
  label: string;
  weight: number;
}

export interface DashData {
  dataAsOf: number;
  config: BacktestConfig;
  assets: DashMarket[];
  runs: DashRun[];
  benchmarkId: string;
  defaultRunId: string;
}
