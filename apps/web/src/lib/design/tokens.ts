/**
 * Design tokens in TS, trimmed from the agentfloor (KEPT / TraderChamber)
 * design system. Class strings are written out literally so Tailwind sees them.
 */

export type Tone = "live" | "neutral" | "hot" | "muted" | "warn" | "danger" | "info" | "success";

export const TONE_CLASS: Record<Tone, string> = {
  live: "border-gold/40 text-gold",
  neutral: "border-ink/15 text-ink/75",
  hot: "border-destructive/50 text-destructive",
  muted: "border-ink/10 text-ink/45",
  warn: "border-series-4/50 text-series-4",
  danger: "border-destructive/50 text-destructive",
  info: "border-series-1/50 text-series-1",
  success: "border-series-3/50 text-series-3",
};

export const TONE_DOT: Partial<Record<Tone, string>> = {
  live: "bg-gold tc-live",
  hot: "bg-destructive",
  danger: "bg-destructive",
};

/** Chart series in order. Hex because Recharts needs raw colours. */
export const SERIES = ["#cbfe42", "#3987e5", "#d95926", "#1a9e70", "#c98500"] as const;

export const COLOR = {
  gold: "#cbfe42",
  ink: "#f1efe6",
  paper: "#0f0f0f",
  destructive: "#e6443d",
  grid: "rgb(241 239 230 / 0.1)",
  axis: "rgb(241 239 230 / 0.15)",
  muted: "rgb(241 239 230 / 0.35)",
} as const;

/**
 * Fixed colour per strategy so a run keeps its colour on every chart. The
 * selected run is always lime; others fall back to SERIES order.
 */
export const STRATEGY_COLOR: Record<string, string> = {
  "buy-and-hold": "#3987e5",
  "coin-flip-42": "#d95926",
  "sma-6-42": "#1a9e70",
  external: "#c98500",
};

export function strategyColor(id: string, index: number): string {
  return STRATEGY_COLOR[id] ?? SERIES[(index % (SERIES.length - 1)) + 1]!;
}
