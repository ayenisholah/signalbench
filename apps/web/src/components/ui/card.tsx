import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** KEPT A7: 12px, 2px L-brackets at each inner corner. ink/35 neutral, lime featured. */
export function CornerBrackets({ tone = "neutral", className }: { tone?: "neutral" | "gold" | "paper"; className?: string }) {
  const color = tone === "gold" ? "border-gold" : tone === "paper" ? "border-paper" : "border-ink/35";
  const base = cn("pointer-events-none absolute h-3 w-3", color);
  return (
    <span aria-hidden data-testid="corner-brackets" className={className}>
      <span className={cn(base, "left-0 top-0 border-l-2 border-t-2")} />
      <span className={cn(base, "right-0 top-0 border-r-2 border-t-2")} />
      <span className={cn(base, "bottom-0 left-0 border-b-2 border-l-2")} />
      <span className={cn(base, "bottom-0 right-0 border-b-2 border-r-2")} />
    </span>
  );
}

export const cardVariants = cva("relative rounded-none border-2 transition-colors duration-300", {
  variants: {
    variant: {
      base: "border-ink/15 bg-paper hover:border-gold",
      static: "border-ink/15 bg-paper",
      tile: "border-ink/20 bg-paper",
      raised: "border-ink/15 bg-card",
      featured: "border-gold bg-paper shadow-trader-card",
      lime: "border-gold bg-gold text-paper",
      gradient: "border-ink/15 bg-trader-card hover:border-gold",
    },
    pad: { none: "", sm: "p-4", md: "p-5 md:p-6", lg: "p-6 md:p-8" },
  },
  defaultVariants: { variant: "base", pad: "md" },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  brackets?: boolean | "gold" | "paper";
  brand?: string;
  as?: "div" | "article" | "section" | "li";
}

export function Card({ className, variant, pad, brackets, brand, as = "div", style, children, ...props }: CardProps) {
  const As = as as "div";
  const tone = brackets === "gold" || variant === "featured" ? "gold" : brackets === "paper" ? "paper" : "neutral";
  return (
    <As className={cn(cardVariants({ variant, pad }), className)} style={brand ? ({ ...style, "--brand": brand } as React.CSSProperties) : style} {...props}>
      {brackets || variant === "featured" ? <CornerBrackets tone={tone} /> : null}
      {children}
    </As>
  );
}

/** Mono header row: meta left (● LIVE), counter right (TASK · 01). */
export function CardMeta({ left, right, className }: { left?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60", className)}>
      <span className="flex items-center gap-2">{left}</span>
      <span>{right}</span>
    </div>
  );
}
