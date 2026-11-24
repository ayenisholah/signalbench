/**
 * Runs every strategy over the cached candles and writes the JSON the web app
 * reads: apps/web/data/index.json and apps/web/data/runs/{id}.json.
 *
 * Bring your own signals (kept out of git under signals/private/):
 *   SB_SIGNALS_FILE=signals/private/model.json \
 *   SB_SIGNALS_MAPPING=signals/private/mapping.json \
 *   SB_SIGNALS_NAME="My model" npm run backtest
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_CONFIG,
  buyAndHold,
  coinFlip,
  computeMetrics,
  drawdownSeries,
  externalSignals,
  monthlyReturns,
  parseSignalFile,
  runBacktest,
  smaCross,
  tradableAnchors,
  type BacktestConfig,
  type Candle,
  type Strategy,
} from "@signalbench/engine";
import { readCache } from "@signalbench/data";
import { CANDLE_DIR, CANDLE_SECONDS, MARKETS, RUNS_DIR } from "./markets";

const DAY = 86_400;
const WINDOWS = { "30d": 30, "90d": 90, "1y": 365, all: Infinity } as const;
const RECENT_ROWS = 250;

const candles: Record<string, Candle[]> = {};
for (const m of MARKETS) {
  const cache = await readCache(CANDLE_DIR, m.pair, CANDLE_SECONDS);
  if (!cache) throw new Error(`No cached candles for ${m.pair}. Run \`npm run fetch\` first.`);
  candles[m.asset] = cache.candles;
}

const config: BacktestConfig = { ...DEFAULT_CONFIG, weights: Object.fromEntries(MARKETS.map((m) => [m.asset, m.weight])) };
const anchors = tradableAnchors(candles, config);

const strategies: Strategy[] = [buyAndHold, smaCross(6, 42), coinFlip(42)];
if (process.env.SB_SIGNALS_FILE && process.env.SB_SIGNALS_MAPPING) {
  const file = JSON.parse(await readFile(process.env.SB_SIGNALS_FILE, "utf8"));
  const mapping = JSON.parse(await readFile(process.env.SB_SIGNALS_MAPPING, "utf8"));
  const signals = parseSignalFile(file, mapping);
  strategies.push(externalSignals("external", process.env.SB_SIGNALS_NAME ?? "External signals", signals));
  console.info(`Loaded ${signals.length} external signals`);
}

const round = (x: number, dp: number) => Math.round(x * 10 ** dp) / 10 ** dp;

await rm(join(RUNS_DIR, "runs"), { recursive: true, force: true });
await mkdir(join(RUNS_DIR, "runs"), { recursive: true });

const summaries = [];
for (const s of strategies) {
  const result = runBacktest(candles, s.signals({ candles, anchors, config }), config);
  const end = result.equity.at(-1)!.t;
  const windows = Object.fromEntries(
    Object.entries(WINDOWS).map(([k, days]) => [k, computeMetrics(result, Number.isFinite(days) ? end - days * DAY : -Infinity, end)]),
  );
  const dd = drawdownSeries(result.equity);

  const run = {
    id: s.id,
    name: s.name,
    description: s.description,
    config,
    windows,
    equity: result.equity.map((p, i) => ({
      t: p.t,
      e: round(p.equity, 2),
      d: round(dd[i]!.drawdown, 5),
      s: Object.fromEntries(Object.entries(p.sleeves).map(([k, v]) => [k, round(v, 2)])),
    })),
    monthly: monthlyReturns(result.equity).map((m) => ({ month: m.month, ret: round(m.ret, 5) })),
    trades: result.trades.slice(-RECENT_ROWS).reverse(),
    orders: result.orders.slice(-RECENT_ROWS).reverse(),
  };
  await writeFile(join(RUNS_DIR, "runs", `${s.id}.json`), JSON.stringify(run));
  summaries.push({ id: s.id, name: s.name, description: s.description, windows });
  const m = windows.all!;
  console.info(
    `${s.name.padEnd(16)} return ${(m.totalReturn * 100).toFixed(2)}%  sharpe ${m.sharpe.toFixed(2)}  maxDD ${(m.maxDrawdown * 100).toFixed(2)}%  fills ${(m.fillRate * 100).toFixed(1)}%  trades ${m.trades}`,
  );
}

const dataAsOf = Math.min(...MARKETS.map((m) => candles[m.asset]!.at(-1)!.t + CANDLE_SECONDS));
await writeFile(
  join(RUNS_DIR, "index.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    dataAsOf,
    config,
    markets: MARKETS.map((m) => {
      const c = candles[m.asset]!;
      return {
        ...m,
        bars: c.length,
        first: c[0]!.t,
        last: c.at(-1)!.t,
        // Liquidity check shown on the methodology page: thin books fill limit orders less often.
        zeroVolumeShare: round(c.filter((b) => b.v === 0).length / c.length, 4),
        flatBarShare: round(c.filter((b) => b.h === b.l).length / c.length, 4),
      };
    }),
    runs: summaries,
  }),
);
console.info(`Wrote ${summaries.length} runs to ${RUNS_DIR}`);
