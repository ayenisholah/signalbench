import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import type { DashData } from "@/components/dashboard/types";
import { loadAllRuns } from "@/lib/runs";
import { DESCRIPTION, SITE_NAME, pageMetadata } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME} · Backtest trading signals with honest fills`,
  description: DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

const BENCHMARK = "buy-and-hold";
const RECENT_TRADES = 10;
const round = (x: number, dp: number) => Math.round(x * 10 ** dp) / 10 ** dp;

export default async function DashboardPage() {
  const { index, runs } = await loadAllRuns();
  const assets = index.markets.map((m) => ({ asset: m.asset, label: m.label, weight: m.weight }));

  const data: DashData = {
    dataAsOf: index.dataAsOf,
    config: index.config,
    assets,
    benchmarkId: BENCHMARK,
    // Lead with the first active strategy; the benchmark and the coin flip are there for comparison.
    defaultRunId: runs.find((r) => r.id !== BENCHMARK && !r.id.startsWith("coin-flip"))?.id ?? runs[0]!.id,
    runs: runs.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      windows: r.windows,
      equity: r.equity.map((p) => [p.t, round(p.e, 2), round(p.d, 5), ...assets.map((a) => round(p.s[a.asset] ?? 0, 2))]),
      monthly: r.monthly,
      recentTrades: r.trades.slice(0, RECENT_TRADES),
    })),
  };

  return <Dashboard data={data} />;
}
