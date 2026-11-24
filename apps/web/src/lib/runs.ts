import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BacktestConfig, Metrics, Order, Trade } from "@signalbench/engine";

/** Written by scripts/run-backtests.ts. */
export type WindowKey = "30d" | "90d" | "1y" | "all";
export const WINDOW_KEYS: WindowKey[] = ["30d", "90d", "1y", "all"];
export const WINDOW_DAYS: Record<WindowKey, number> = { "30d": 30, "90d": 90, "1y": 365, all: Infinity };

export interface RunSummary {
  id: string;
  name: string;
  description: string;
  windows: Record<WindowKey, Metrics>;
}

export interface Market {
  asset: string;
  pair: string;
  label: string;
  weight: number;
  bars: number;
  first: number;
  last: number;
  zeroVolumeShare: number;
  flatBarShare: number;
}

export interface RunIndex {
  generatedAt: string;
  dataAsOf: number;
  config: BacktestConfig;
  markets: Market[];
  runs: RunSummary[];
}

/** One equity sample: time, equity, drawdown and per-sleeve equity. */
export interface EquitySample {
  t: number;
  e: number;
  d: number;
  s: Record<string, number>;
}

export interface Run extends RunSummary {
  config: BacktestConfig;
  equity: EquitySample[];
  monthly: { month: string; ret: number }[];
  trades: Trade[];
  orders: Order[];
}

const DATA_DIR = join(process.cwd(), "data");

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export function loadIndex(): Promise<RunIndex> {
  return readJson<RunIndex>(join(DATA_DIR, "index.json"));
}

export function loadRun(id: string): Promise<Run> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Bad run id: ${id}`);
  return readJson<Run>(join(DATA_DIR, "runs", `${id}.json`));
}

export async function loadAllRuns(): Promise<{ index: RunIndex; runs: Run[] }> {
  const index = await loadIndex();
  const runs = await Promise.all(index.runs.map((r) => loadRun(r.id)));
  return { index, runs };
}
