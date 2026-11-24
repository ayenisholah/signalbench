/** Display formatting. Every function is pure and locale-fixed so server and client render the same text. */

const LOCALE = "en-US";

export function pct(x: number, dp = 2, signed = true): string {
  if (!Number.isFinite(x)) return "—";
  const s = (x * 100).toFixed(dp);
  return `${signed && x > 0 ? "+" : ""}${s}%`;
}

export function ratio(x: number, dp = 2): string {
  return Number.isFinite(x) ? x.toFixed(dp) : "—";
}

export function money(x: number, dp = 0): string {
  return x.toLocaleString(LOCALE, { style: "currency", currency: "USD", minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function price(x: number): string {
  return x.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: x < 10 ? 6 : 2 });
}

export function qty(x: number): string {
  return x.toLocaleString(LOCALE, { maximumFractionDigits: 6 });
}

export function int(x: number): string {
  return Math.round(x).toLocaleString(LOCALE);
}

/** 2026-11-24 08:00 UTC */
export function utc(t: number): string {
  return `${new Date(t * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** 24 NOV 2026 */
export function day(t: number): string {
  return new Date(t * 1000).toLocaleDateString(LOCALE, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

/** NOV 24 — for chart axes. */
export function shortDay(t: number): string {
  return new Date(t * 1000).toLocaleDateString(LOCALE, { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase();
}

/** "2026-03" → "MAR 26" */
export function month(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(LOCALE, { month: "short", year: "2-digit", timeZone: "UTC" }).toUpperCase();
}

/** Tailwind text colour for a signed number: lime up, red down. */
export function signClass(x: number): string {
  return x > 0 ? "text-gold" : x < 0 ? "text-destructive" : "text-ink/75";
}
