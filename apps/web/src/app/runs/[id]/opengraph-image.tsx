import { day, pct, ratio } from "@/lib/format";
import { OG_SIZE, shareCard, toneOf } from "@/lib/og/card";
import { loadIndex } from "@/lib/runs";

export const alt = "SignalBench strategy run: return, Sharpe and max drawdown";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await loadIndex();
  return index.runs.map((r) => ({ id: r.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = await loadIndex();
  const run = index.runs.find((r) => r.id === id)!;
  const m = run.windows.all;
  return shareCard({
    eyebrow: "Strategy run · 70/30 gold/BTC",
    title: run.name,
    subtitle: run.description,
    stats: [
      { label: "Return", value: pct(m.totalReturn, 1), tone: toneOf(m.totalReturn) },
      { label: "Sharpe", value: ratio(m.sharpe), tone: toneOf(m.sharpe) },
      { label: "Max DD", value: pct(m.maxDrawdown, 1, false), tone: "down" },
      { label: "Fill rate", value: pct(m.fillRate, 0, false) },
    ],
    footer: `Data to ${day(index.dataAsOf)}`,
  });
}
