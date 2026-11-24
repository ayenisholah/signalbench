import type { BacktestResult, EquityPoint, Metrics, UnixSeconds } from "./types";

const DAY = 86_400;
/** Crypto and tokenised gold trade every day, so annualise over 365 days. */
export const PERIODS_PER_YEAR = 365;

function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** Sample standard deviation (n - 1). */
function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Equity at each 00:00 UTC point, plus the final point if it isn't on a day boundary. */
export function dailyEquity(equity: readonly EquityPoint[]): EquityPoint[] {
  const daily = equity.filter((p) => p.t % DAY === 0);
  const last = equity[equity.length - 1];
  if (last && daily[daily.length - 1] !== last) daily.push(last);
  if (equity[0] && daily[0] !== equity[0]) daily.unshift(equity[0]);
  return daily;
}

export function periodReturns(points: readonly EquityPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) out.push(points[i]!.equity / points[i - 1]!.equity - 1);
  return out;
}

/** Annualised Sharpe ratio of daily returns with a zero risk-free rate. */
export function sharpe(daily: readonly number[]): number {
  const sd = stdev(daily);
  return sd === 0 ? 0 : (mean(daily) / sd) * Math.sqrt(PERIODS_PER_YEAR);
}

/** Annualised Sortino ratio: like Sharpe, but only downside moves count as risk. */
export function sortino(daily: readonly number[]): number {
  if (daily.length < 2) return 0;
  const dd = Math.sqrt(mean(daily.map((r) => Math.min(r, 0) ** 2)));
  return dd === 0 ? 0 : (mean(daily) / dd) * Math.sqrt(PERIODS_PER_YEAR);
}

export interface DrawdownPoint {
  t: UnixSeconds;
  drawdown: number;
}

export function drawdownSeries(equity: readonly EquityPoint[]): DrawdownPoint[] {
  let peak = -Infinity;
  return equity.map((p) => {
    peak = Math.max(peak, p.equity);
    return { t: p.t, drawdown: p.equity / peak - 1 };
  });
}

/** Deepest drawdown (a negative number) and the longest time spent below a prior peak, in days. */
export function maxDrawdown(equity: readonly EquityPoint[]): { depth: number; days: number } {
  let peak = -Infinity;
  let peakT = equity[0]?.t ?? 0;
  let depth = 0;
  let longest = 0;
  for (const p of equity) {
    if (p.equity >= peak) {
      peak = p.equity;
      peakT = p.t;
    } else {
      depth = Math.min(depth, p.equity / peak - 1);
      longest = Math.max(longest, p.t - peakT);
    }
  }
  return { depth, days: longest / DAY };
}

export interface MonthlyReturn {
  /** YYYY-MM in UTC. */
  month: string;
  ret: number;
}

/** Return for each calendar month (UTC), chained from the last equity of the previous month. */
export function monthlyReturns(equity: readonly EquityPoint[]): MonthlyReturn[] {
  const out: MonthlyReturn[] = [];
  let base = equity[0]?.equity;
  let current = "";
  let lastEq = 0;
  for (const p of equity) {
    const m = new Date(p.t * 1000).toISOString().slice(0, 7);
    if (m !== current) {
      if (current && base !== undefined) {
        out.push({ month: current, ret: lastEq / base - 1 });
        base = lastEq;
      }
      current = m;
    }
    lastEq = p.equity;
  }
  if (current && base !== undefined) out.push({ month: current, ret: lastEq / base - 1 });
  return out;
}

/**
 * Metrics for a result, optionally limited to [from, to]. The simulation
 * itself is never re-run: a window just reads a slice of the same history.
 */
export function computeMetrics(result: BacktestResult, from: UnixSeconds = -Infinity, to: UnixSeconds = Infinity): Metrics {
  const eq = result.equity.filter((p) => p.t >= from && p.t <= to);
  const first = eq[0];
  const last = eq[eq.length - 1];
  if (!first || !last) throw new Error("No equity points in range");

  const days = (last.t - first.t) / DAY;
  const totalReturn = last.equity / first.equity - 1;
  const cagr = days > 0 ? (last.equity / first.equity) ** (PERIODS_PER_YEAR / days) - 1 : 0;
  const daily = periodReturns(dailyEquity(eq));
  const dd = maxDrawdown(eq);

  const orders = result.orders.filter((o) => o.placedAt >= first.t && o.placedAt <= last.t);
  const filled = orders.filter((o) => o.status === "filled");
  const trades = result.trades.filter((t) => t.closedAt >= first.t && t.closedAt <= last.t);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const notional = filled.reduce((s, o) => s + o.qty * o.limit, 0);
  const meanEquity = mean(eq.map((p) => p.equity));
  const exp = result.exposure.filter((e) => e.t >= first.t && e.t <= last.t);

  return {
    start: first.t,
    end: last.t,
    days,
    totalReturn,
    cagr,
    sharpe: sharpe(daily),
    sortino: sortino(daily),
    maxDrawdown: dd.depth,
    maxDrawdownDays: dd.days,
    volatility: stdev(daily) * Math.sqrt(PERIODS_PER_YEAR),
    trades: trades.length,
    winRate: trades.length ? wins / trades.length : 0,
    ordersPlaced: orders.length,
    fillRate: orders.length ? filled.length / orders.length : 0,
    turnover: meanEquity > 0 ? notional / meanEquity : 0,
    exposure: mean(exp.map((e) => e.gross)),
    fees: filled.reduce((s, o) => s + (o.fee ?? 0), 0),
  };
}
