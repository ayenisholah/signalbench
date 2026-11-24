import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metrics, Order, Trade } from "@signalbench/engine";
import { Card, CardMeta } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Section } from "@/components/ui/section";
import { DataTable, KeyValue } from "@/components/ui/table";
import { TabNav } from "@/components/ui/segmented";
import { MonthlyBars } from "@/components/charts/charts";
import { day, int, money, pct, price, qty, ratio, signClass, utc } from "@/lib/format";
import { WINDOW_KEYS, loadIndex, loadRun, type WindowKey } from "@/lib/runs";

export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await loadIndex();
  return index.runs.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const index = await loadIndex();
  const run = index.runs.find((r) => r.id === id);
  return run ? { title: run.name, description: run.description } : {};
}

const WINDOW_LABEL: Record<WindowKey, string> = { "30d": "30 days", "90d": "90 days", "1y": "1 year", all: "All" };

const METRIC_ROWS: { label: string; get: (m: Metrics) => string; signed?: (m: Metrics) => number }[] = [
  { label: "Total return", get: (m) => pct(m.totalReturn), signed: (m) => m.totalReturn },
  { label: "CAGR", get: (m) => pct(m.cagr), signed: (m) => m.cagr },
  { label: "Sharpe", get: (m) => ratio(m.sharpe), signed: (m) => m.sharpe },
  { label: "Sortino", get: (m) => ratio(m.sortino), signed: (m) => m.sortino },
  { label: "Volatility (ann.)", get: (m) => pct(m.volatility, 1, false) },
  { label: "Max drawdown", get: (m) => pct(m.maxDrawdown, 1, false), signed: (m) => m.maxDrawdown },
  { label: "Days underwater", get: (m) => m.maxDrawdownDays.toFixed(0) },
  { label: "Closed trades", get: (m) => int(m.trades) },
  { label: "Win rate", get: (m) => (m.trades ? pct(m.winRate, 0, false) : "—") },
  { label: "Orders placed", get: (m) => int(m.ordersPlaced) },
  { label: "Fill rate", get: (m) => (m.ordersPlaced ? pct(m.fillRate, 0, false) : "—") },
  { label: "Turnover", get: (m) => `${m.turnover.toFixed(1)}×` },
  { label: "Avg gross exposure", get: (m) => pct(m.exposure, 0, false) },
  { label: "Fees", get: (m) => money(m.fees) },
];

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = await loadIndex();
  if (!index.runs.some((r) => r.id === id)) notFound();
  const run = await loadRun(id);
  const all = run.windows.all;

  return (
    <Section pad="page" rule={false}>
      <PageHeader
        eyebrow={<>Run · {run.id}</>}
        title={run.name}
        lead={run.description}
        actions={
          <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:underline">
            ← Dashboard
          </Link>
        }
      >
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/55">
          {day(all.start)} → {day(all.end)} · {all.days.toFixed(0)} days
        </p>
      </PageHeader>

      <TabNav label="Runs" value={run.id} items={index.runs.map((r) => ({ value: r.id, label: r.name, href: `/runs/${r.id}` }))} className="mb-8" />

      <div className="flex flex-col gap-4">
        <Card variant="static" pad="lg" brackets="gold">
          <CardMeta left="Metrics by window" right={`${WINDOW_KEYS.length} windows`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <caption className="sr-only">Metrics for {run.name} over each window</caption>
              <thead>
                <tr className="border-b border-ink/10">
                  <th scope="col" className="py-3 text-left font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-ink/75">
                    Metric
                  </th>
                  {WINDOW_KEYS.map((k) => (
                    <th key={k} scope="col" className="py-3 text-right font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-ink/75">
                      {WINDOW_LABEL[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-ink/10 hover:bg-ink/[0.03]">
                    <th scope="row" className="py-3 text-left text-[14px] font-normal text-ink/85">
                      {row.label}
                    </th>
                    {WINDOW_KEYS.map((k) => {
                      const m = run.windows[k];
                      return (
                        <td key={k} className={`tabular py-3 text-right font-mono text-[13px] ${row.signed ? signClass(row.signed(m)) : ""}`}>
                          {row.get(m)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card variant="static" pad="lg">
            <CardMeta left="Monthly returns" right={`${run.monthly.length} months`} />
            <MonthlyBars rows={run.monthly} label={`${run.name} monthly returns`} />
          </Card>
          <Card variant="static" pad="lg">
            <CardMeta left="Config" right="As run" />
            <KeyValue
              rows={[
                { label: "Capital", value: money(run.config.initialCapital) },
                {
                  label: "Weights",
                  value: Object.entries(run.config.weights)
                    .map(([a, w]) => `${a} ${Math.round(w * 100)}%`)
                    .join(" · "),
                },
                { label: "Interval", value: `${run.config.intervalSeconds / 3600}h UTC` },
                { label: "Limit offset", value: `${run.config.limitOffsetBps} bps` },
                { label: "Fill rule", value: run.config.fillRule },
                { label: "Fee", value: `${run.config.feeBps} bps` },
                { label: "Bars", value: `${run.config.candleSeconds / 60}m` },
              ]}
            />
          </Card>
        </div>

        <Card variant="static" pad="lg">
          <CardMeta left="Closed trades" right={`Latest ${run.trades.length}`} />
          <DataTable<Trade>
            caption={`Closed trades for ${run.name}, newest first`}
            rows={run.trades}
            rowKey={(t) => `${t.asset}-${t.openedAt}-${t.closedAt}`}
            empty={<p className="py-6 text-ink/60">No closed trades. Positions still open at the end aren&apos;t counted.</p>}
            columns={[
              { key: "opened", header: "Opened", primary: true, cell: (t) => <span className="font-mono text-[12px]">{utc(t.openedAt)}</span> },
              { key: "closed", header: "Closed", cell: (t) => <span className="font-mono text-[12px]">{utc(t.closedAt)}</span> },
              { key: "asset", header: "Asset", cell: (t) => t.asset },
              { key: "dir", header: "Side", cell: (t) => <Badge tone={t.direction === "long" ? "success" : "warn"}>{t.direction}</Badge> },
              { key: "entry", header: "Entry", align: "right", hideOnMobile: true, cell: (t) => price(t.entry) },
              { key: "exit", header: "Exit", align: "right", hideOnMobile: true, cell: (t) => price(t.exit) },
              { key: "pnl", header: "PnL", align: "right", cell: (t) => <span className={signClass(t.pnl)}>{money(t.pnl, 2)}</span> },
              { key: "ret", header: "Return", align: "right", cell: (t) => <span className={signClass(t.ret)}>{pct(t.ret)}</span> },
            ]}
          />
        </Card>

        <Card variant="static" pad="lg">
          <CardMeta left="Order log" right={`Latest ${run.orders.length}`} />
          <DataTable<Order>
            caption={`Limit orders for ${run.name}, newest first`}
            rows={run.orders}
            rowKey={(o) => `${o.asset}-${o.placedAt}`}
            columns={[
              { key: "placed", header: "Placed", primary: true, cell: (o) => <span className="font-mono text-[12px]">{utc(o.placedAt)}</span> },
              { key: "asset", header: "Asset", cell: (o) => o.asset },
              { key: "side", header: "Side", cell: (o) => <Badge tone={o.side === "buy" ? "success" : "warn"}>{o.side}</Badge> },
              { key: "ref", header: "Reference", align: "right", hideOnMobile: true, cell: (o) => price(o.reference) },
              { key: "limit", header: "Limit", align: "right", cell: (o) => price(o.limit) },
              { key: "qty", header: "Qty", align: "right", hideOnMobile: true, cell: (o) => qty(o.qty) },
              {
                key: "status",
                header: "Status",
                align: "right",
                cell: (o) => (
                  <Badge tone={o.status === "filled" ? "live" : "muted"} dot={o.status === "filled"}>
                    {o.status === "filled" && o.filledAt !== undefined ? `Filled +${Math.round((o.filledAt - o.placedAt) / 60)}m` : "Cancelled"}
                  </Badge>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </Section>
  );
}
