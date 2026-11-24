"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardMeta } from "@/components/ui/card";
import { Badge, Swatch } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { DataTable, KeyValue } from "@/components/ui/table";
import { Display, Eyebrow, Label, Lead } from "@/components/ui/typography";
import { CONTAINER } from "@/components/ui/section";
import { btn } from "@/components/ui/button-variants";
import { DrawdownChart, EquityChart, MonthlyBars, type LineSeries } from "@/components/charts/charts";
import { COLOR, strategyColor } from "@/lib/design/tokens";
import { day, int, money, pct, price, ratio, signClass, utc } from "@/lib/format";
import { cn, pad } from "@/lib/utils";
import type { DashData, DashRun, WindowKey } from "./types";

const WINDOWS: { value: WindowKey; label: string; days: number }[] = [
  { value: "30d", label: "30D", days: 30 },
  { value: "90d", label: "90D", days: 90 },
  { value: "1y", label: "1Y", days: 365 },
  { value: "all", label: "All", days: Infinity },
];

function sliceEquity(run: DashRun, from: number): number[][] {
  return run.equity.filter((p) => p[0]! >= from);
}

function KpiTile({ label, value, sub, tone, index }: { label: string; value: string; sub?: React.ReactNode; tone?: number; index: number }) {
  return (
    <Card variant="tile" pad="md" className="flex flex-col justify-between">
      <CardMeta left={label} right={pad(index)} />
      <p className={cn("tc-display tabular text-[clamp(2rem,3.4vw,2.8rem)]", tone === undefined ? "text-gold" : signClass(tone))}>{value}</p>
      {sub ? <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55">{sub}</p> : null}
    </Card>
  );
}

export function Dashboard({ data }: { data: DashData }) {
  const [runId, setRunId] = React.useState(data.defaultRunId);
  const [win, setWin] = React.useState<WindowKey>("all");

  const run = data.runs.find((r) => r.id === runId) ?? data.runs[0]!;
  const bench = data.runs.find((r) => r.id === data.benchmarkId);
  const m = run.windows[win];
  const bm = bench?.windows[win];
  const end = run.equity[run.equity.length - 1]![0]!;
  const days = WINDOWS.find((w) => w.value === win)!.days;
  const from = Number.isFinite(days) ? end - days * 86_400 : -Infinity;

  const colors = Object.fromEntries(data.runs.map((r, i) => [r.id, r.id === run.id ? COLOR.gold : strategyColor(r.id, i)]));
  const series: LineSeries[] = data.runs.map((r) => ({ id: r.id, name: r.name, color: colors[r.id]!, primary: r.id === run.id }));

  const equityRows = React.useMemo(() => {
    const sliced = data.runs.map((r) => ({ id: r.id, pts: sliceEquity(r, from) }));
    const base = sliced[0]!.pts;
    return base.map((p, i) => {
      const row: Record<string, number> = { t: p[0]! };
      for (const s of sliced) {
        const v = s.pts[i];
        if (v) row[s.id] = (v[1]! / s.pts[0]![1]!) * 100;
      }
      return row;
    });
  }, [data.runs, from]);

  const ddRows = React.useMemo(() => {
    const pts = sliceEquity(run, from);
    let peak = -Infinity;
    return pts.map((p) => {
      peak = Math.max(peak, p[1]!);
      return { t: p[0]!, d: p[1]! / peak - 1 };
    });
  }, [run, from]);

  const monthly = run.monthly.filter((x) => Date.UTC(Number(x.month.slice(0, 4)), Number(x.month.slice(5, 7)), 1) / 1000 > from);
  const sliced = sliceEquity(run, from);
  const sleeveStart = sliced[0]!;
  const sleeveEnd = sliced[sliced.length - 1]!;

  return (
    <>
      {/* Hero + controls */}
      <section className="tc-grid relative w-full">
        <div className={cn(CONTAINER, "py-14 md:py-16")}>
          <div className="tc-stagger grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <Eyebrow live>
                Backtest · {data.assets.map((a) => `${Math.round(a.weight * 100)}% ${a.asset.replace("USD", "")}`).join(" / ")} · to {day(data.dataAsOf)}
              </Eyebrow>
              <Display as="h1" size="xl" lines={["Honest fills.", "Real metrics."]} accentFrom={1} />
            </div>
            <Lead>
              Every signal trades as a {data.config.limitOffsetBps} bps limit order on a fixed {data.config.intervalSeconds / 3600}-hour UTC schedule. If price
              doesn&apos;t trade through the limit inside the window, the order is cancelled. It&apos;s never chased.
            </Lead>
          </div>
          <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Segmented label="Strategy" value={run.id} onChange={setRunId} items={data.runs.map((r) => ({ value: r.id, label: r.name }))} />
            <Segmented label="Window" value={win} onChange={(v) => setWin(v as WindowKey)} items={WINDOWS.map((w) => ({ value: w.value, label: w.label }))} />
          </div>
        </div>
      </section>

      <div className={cn(CONTAINER, "flex flex-col gap-4 pb-20")}>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          <span className="text-ink/85">{run.name}</span> · {run.description}
        </p>

        {/* KPI tiles */}
        <div className="tc-stagger grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-6">
          <KpiTile
            index={1}
            label="Total return"
            value={pct(m.totalReturn, 1)}
            tone={m.totalReturn}
            sub={bm && run.id !== bench?.id ? <>vs hold {pct(m.totalReturn - bm.totalReturn, 1)}</> : `${m.days.toFixed(0)} days`}
          />
          <KpiTile index={2} label="Sharpe" value={ratio(m.sharpe)} tone={m.sharpe} sub={`Sortino ${ratio(m.sortino)}`} />
          <KpiTile
            index={3}
            label="Max drawdown"
            value={pct(m.maxDrawdown, 1, false)}
            tone={m.maxDrawdown}
            sub={`${m.maxDrawdownDays.toFixed(0)} days underwater`}
          />
          <KpiTile index={4} label="Win rate" value={m.trades ? pct(m.winRate, 0, false) : "—"} sub={`${int(m.trades)} closed trades`} />
          <KpiTile index={5} label="Fill rate" value={m.ordersPlaced ? pct(m.fillRate, 0, false) : "—"} sub={`${int(m.ordersPlaced)} orders placed`} />
          <KpiTile index={6} label="Fees paid" value={money(m.fees)} sub={`Turnover ${m.turnover.toFixed(1)}×`} />
        </div>

        {/* Equity */}
        <Card variant="static" pad="lg" brackets="gold">
          <CardMeta left={<>Equity · growth of 100</>} right={`${day(sleeveStart[0]!)} → ${day(sleeveEnd[0]!)}`} />
          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
            {series.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setRunId(s.id)}
                className={cn(
                  "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]",
                  s.primary ? "text-ink" : "text-ink/55 hover:text-ink",
                )}
              >
                <Swatch color={s.color} />
                {s.name}
              </button>
            ))}
          </div>
          <EquityChart rows={equityRows} series={series} label={`Equity curves, ${WINDOWS.find((w) => w.value === win)!.label} window`} />
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card variant="static" pad="lg">
            <CardMeta left="Drawdown" right={`Deepest ${pct(m.maxDrawdown, 1)}`} />
            <DrawdownChart rows={ddRows} color={COLOR.destructive} label={`${run.name} drawdown`} />
          </Card>
          <Card variant="static" pad="lg">
            <CardMeta left="Monthly returns" right={`${monthly.length} months`} />
            <MonthlyBars rows={monthly} label={`${run.name} monthly returns`} />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card variant="static" pad="lg">
            <CardMeta left="Assumptions" right="Config" />
            <KeyValue
              rows={[
                { label: "Starting capital", value: money(data.config.initialCapital) },
                { label: "Decision schedule", value: `Every ${data.config.intervalSeconds / 3600}h on the UTC clock` },
                { label: "Order type", value: `Limit, ${data.config.limitOffsetBps} bps from last close` },
                { label: "Fill rule", value: data.config.fillRule === "through" ? "Price must trade through the limit" : "Touching the limit fills" },
                { label: "Unfilled orders", value: "Cancelled at window end, never chased" },
                { label: "Fees", value: `${data.config.feeBps} bps per fill` },
              ]}
            />
          </Card>
          <Card variant="static" pad="lg">
            <CardMeta left="Sleeves" right="Each asset trades its own capital" />
            <div className="grid gap-3 sm:grid-cols-2">
              {data.assets.map((a, i) => {
                const s0 = sleeveStart[3 + i]!;
                const s1 = sleeveEnd[3 + i]!;
                const r = s1 / s0 - 1;
                return (
                  <div key={a.asset} className="border-2 border-ink/15 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Label>{a.label}</Label>
                      <Badge tone="live">{Math.round(a.weight * 100)}%</Badge>
                    </div>
                    <p className={cn("tc-display tabular text-[2rem]", signClass(r))}>{pct(r, 1)}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55">
                      {money(s0)} → {money(s1)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Comparison */}
        <Card variant="static" pad="lg">
          <CardMeta left={`All runs · ${WINDOWS.find((w) => w.value === win)!.label}`} right={`${pad(data.runs.length)} runs`} />
          <DataTable
            caption="Every strategy over the selected window"
            rows={data.runs}
            rowKey={(r) => r.id}
            columns={[
              {
                key: "name",
                header: "Strategy",
                primary: true,
                cell: (r) => (
                  <Link href={`/runs/${r.id}`} className="flex items-center gap-2 font-medium hover:text-gold">
                    <Swatch color={colors[r.id]!} />
                    {r.name}
                  </Link>
                ),
              },
              {
                key: "ret",
                header: "Return",
                align: "right",
                cell: (r) => <span className={signClass(r.windows[win].totalReturn)}>{pct(r.windows[win].totalReturn)}</span>,
              },
              { key: "sharpe", header: "Sharpe", align: "right", cell: (r) => ratio(r.windows[win].sharpe) },
              {
                key: "dd",
                header: "Max DD",
                align: "right",
                cell: (r) => <span className="text-destructive">{pct(r.windows[win].maxDrawdown, 1, false)}</span>,
              },
              { key: "fill", header: "Fill rate", align: "right", cell: (r) => pct(r.windows[win].fillRate, 0, false) },
              { key: "trades", header: "Trades", align: "right", cell: (r) => int(r.windows[win].trades) },
              { key: "fees", header: "Fees", align: "right", hideOnMobile: true, cell: (r) => money(r.windows[win].fees) },
            ]}
          />
        </Card>

        {/* Recent trades */}
        <Card variant="static" pad="lg">
          <CardMeta
            left={`Recent trades · ${run.name}`}
            right={
              <Link href={`/runs/${run.id}`} className="text-gold hover:underline">
                All trades →
              </Link>
            }
          />
          <DataTable
            caption={`Most recent closed trades for ${run.name}`}
            rows={run.recentTrades}
            rowKey={(t) => `${t.asset}-${t.openedAt}-${t.closedAt}`}
            empty={<p className="py-6 text-ink/60">No closed trades yet. {run.id === data.benchmarkId ? "Buy and hold never sells." : null}</p>}
            columns={[
              { key: "closed", header: "Closed", primary: true, cell: (t) => <span className="font-mono text-[12px]">{utc(t.closedAt)}</span> },
              { key: "asset", header: "Asset", cell: (t) => t.asset },
              { key: "dir", header: "Side", cell: (t) => <Badge tone={t.direction === "long" ? "success" : "warn"}>{t.direction}</Badge> },
              { key: "entry", header: "Entry", align: "right", hideOnMobile: true, cell: (t) => price(t.entry) },
              { key: "exit", header: "Exit", align: "right", hideOnMobile: true, cell: (t) => price(t.exit) },
              { key: "pnl", header: "PnL", align: "right", cell: (t) => <span className={signClass(t.pnl)}>{money(t.pnl, 2)}</span> },
              { key: "ret", header: "Return", align: "right", cell: (t) => <span className={signClass(t.ret)}>{pct(t.ret)}</span> },
            ]}
          />
        </Card>

        <div className="flex flex-wrap gap-3 pt-6">
          <Link href={`/runs/${run.id}`} className={btn("primary", "lg")}>
            Open run <span className="tc-arrow">→</span>
          </Link>
          <Link href="/methodology" className={btn("outline", "lg")}>
            Methodology <span className="tc-arrow">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
