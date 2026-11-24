import type { Metadata } from "next";
import { Card, CardMeta } from "@/components/ui/card";
import { PageHeader, Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { Display, Eyebrow } from "@/components/ui/typography";
import { REPO_URL } from "@/components/shell/header";
import { day, int, pct } from "@/lib/format";
import { loadIndex, type Market } from "@/lib/runs";
import { cn, pad } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How SignalBench simulates limit-order fills, computes Sharpe and drawdown, and where the numbers can mislead.",
};

function Rule({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card variant="static" pad="lg" as="article">
      <CardMeta left={`Rule · ${pad(n)}`} />
      <Display as="h3" size="md" className="mb-4">
        {title}
      </Display>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink/80">{children}</div>
    </Card>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="border border-ink/15 bg-card px-1.5 py-0.5 font-mono text-[12px] text-gold">{children}</code>;
}

export default async function MethodologyPage() {
  const index = await loadIndex();
  const c = index.config;
  const thin = [...index.markets].sort((a, b) => b.zeroVolumeShare - a.zeroVolumeShare)[0];

  return (
    <Section pad="page" rule={false}>
      <PageHeader
        eyebrow="Methodology"
        title="How the numbers are made."
        lead="A backtest is only as honest as its fill model. These are the rules every run follows, and the places where the results can still mislead you."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Rule n={1} title="A fixed UTC clock.">
          <p>
            Decisions happen every {c.intervalSeconds / 3600} hours on the UTC clock (00:00, 04:00, 08:00 …), whatever the strategy. A signal only counts from
            the first anchor at or after its timestamp, so a strategy can never act on a price it couldn&apos;t have seen.
          </p>
        </Rule>
        <Rule n={2} title="Limit orders, never chased.">
          <p>
            At each anchor the engine compares the target exposure with the current position and places one limit order for the difference, {c.limitOffsetBps}{" "}
            bps better than the last closed {c.candleSeconds / 60}-minute bar: below it for buys, above it for sells.
          </p>
          <p>
            The order fills on the first bar in the next {c.intervalSeconds / 3600} hours where price trades <em>through</em> the limit (a buy needs a low
            strictly below it). Touching isn&apos;t enough. If nothing fills, the order is cancelled at the end of the window and re-evaluated at the next
            anchor, at the then-current price.
          </p>
        </Rule>
        <Rule n={3} title="Conservative fills.">
          <p>
            Fills are all-or-nothing and always at the limit price, even if price gapped through it. There&apos;s no price improvement, no partial fill and no
            queue position, and each fill pays a {c.feeBps} bps fee.
          </p>
          <p>
            Limit orders also suffer adverse selection: they tend to fill when price is moving against you. That cost is real, and it&apos;s why a random
            strategy loses money here even before fees.
          </p>
        </Rule>
        <Rule n={4} title="Independent sleeves.">
          <p>
            Each asset trades its own slice of the capital ({index.markets.map((m) => `${m.asset} ${Math.round(m.weight * 100)}%`).join(", ")}). Sleeves
            aren&apos;t rebalanced against each other, so a winning sleeve grows its share of the portfolio. Sizing uses the whole sleeve, so fees can take cash
            a hair below zero.
          </p>
        </Rule>
        <Rule n={5} title="Metrics.">
          <p>
            Sharpe and Sortino use daily returns sampled at 00:00 UTC, annualised with <Code>√365</Code> because both markets trade every day, with a zero
            risk-free rate. Max drawdown uses every {c.intervalSeconds / 3600}h equity point. A trade is a round trip from flat back to flat (or through zero),
            and its PnL includes fees. Positions still open at the end don&apos;t count as trades.
          </p>
        </Rule>
        <Rule n={6} title="Bring your own signals.">
          <p>
            Any JSON signal file can be mapped onto the engine with a small field mapping: time, asset and either a side (<Code>BUY</Code>, <Code>SELL</Code>,{" "}
            <Code>FLAT</Code>) or a target exposure between −1 and 1. See the{" "}
            <a href={`${REPO_URL}#bring-your-own-signals`} className="text-gold underline-offset-4 hover:underline">
              README
            </a>
            .
          </p>
        </Rule>
      </div>

      <section className="mt-16">
        <Eyebrow>Data</Eyebrow>
        <Display as="h2" size="lg" className="mb-8">
          Where prices come from.
        </Display>
        <Card variant="static" pad="lg">
          <CardMeta left="Bitstamp public OHLC" right={`${c.candleSeconds / 60}m bars`} />
          <DataTable<Market>
            caption="Market data used by every run"
            rows={index.markets}
            rowKey={(m) => m.asset}
            columns={[
              { key: "label", header: "Market", primary: true, cell: (m) => <span className="font-medium">{m.label}</span> },
              { key: "pair", header: "Pair", cell: (m) => <Code>{m.pair}</Code> },
              { key: "range", header: "Range", cell: (m) => `${day(m.first)} → ${day(m.last)}` },
              { key: "bars", header: "Bars", align: "right", cell: (m) => int(m.bars) },
              {
                key: "zero",
                header: "Zero-volume bars",
                align: "right",
                cell: (m) => <span className={cn(m.zeroVolumeShare > 0.25 && "text-series-4")}>{pct(m.zeroVolumeShare, 0, false)}</span>,
              },
            ]}
          />
        </Card>
        {thin && thin.zeroVolumeShare > 0.25 ? (
          <Card variant="static" pad="lg" className="mt-4 border-series-4/50">
            <CardMeta left={<span className="text-series-4">Caveat · thin market</span>} />
            <p className="max-w-3xl text-[15px] leading-relaxed text-ink/80">
              {thin.label} is a tokenised-gold proxy, not spot XAUUSD, and it&apos;s thin on Bitstamp: {pct(thin.zeroVolumeShare, 0, false)} of its{" "}
              {c.candleSeconds / 60}-minute bars have no trades at all. A limit order can only fill when someone trades, so the gold sleeve fills far less often
              than BTC does. That&apos;s exactly the kind of gap a backtest that assumes instant fills at the close would hide.
            </p>
          </Card>
        ) : null}
      </section>
    </Section>
  );
}
