import * as React from "react";
import { cn } from "@/lib/utils";
import { TONE_CLASS, TONE_DOT, type Tone } from "@/lib/design/tokens";

const BADGE_BASE =
  "inline-flex items-center gap-1.5 rounded-none border px-1.5 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.1em] whitespace-nowrap";

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASS[tone], className)}>
      {dot && TONE_DOT[tone] ? <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} /> : null}
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rounded-full bg-gold tc-live", className)} />;
}

/** Small colour key for a chart series. */
export function Swatch({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2 w-2", className)} style={{ backgroundColor: color }} />;
}
