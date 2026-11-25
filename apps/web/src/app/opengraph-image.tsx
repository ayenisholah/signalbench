import { day } from "@/lib/format";
import { OG_SIZE, shareCard } from "@/lib/og/card";
import { loadIndex } from "@/lib/runs";
import { DEFAULT_SHARE_IMAGE } from "@/lib/site";

export const alt = DEFAULT_SHARE_IMAGE.alt;
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-static";

export default async function Image() {
  const index = await loadIndex();
  return shareCard({
    eyebrow: "Backtest · 70/30 gold/BTC",
    title: "Honest fills. Real metrics.",
    subtitle: "Every signal trades as a 2 bps limit order on a fixed 4-hour UTC schedule. No fill inside the window means no trade. Never chased.",
    stats: [
      { label: "Limit offset", value: "2 bps" },
      { label: "Schedule", value: "4h UTC" },
      { label: "Strategies", value: String(index.runs.length) },
    ],
    footer: `Data to ${day(index.dataAsOf)}`,
  });
}
