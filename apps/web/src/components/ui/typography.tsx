import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** KEPT A6 type scale. */
export const displayVariants = cva("tc-display uppercase text-balance", {
  variants: {
    size: {
      xl: "text-[clamp(2.7rem,6.2vw,5.6rem)] lg:text-[clamp(3rem,4.6vw,4.6rem)] leading-[0.9]",
      lg: "text-[clamp(2rem,4.6vw,3.8rem)] leading-[0.95]",
      md: "text-[clamp(1.35rem,2vw,1.7rem)] leading-none",
      sm: "text-[18px] leading-none",
    },
  },
  defaultVariants: { size: "lg" },
});

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "p" | "div";

export interface DisplayProps extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof displayVariants> {
  as?: HeadingTag;
  /** Two-tone: lines after the first `accentFrom` index render lime. Use "\n" to split lines. */
  lines?: string[];
  accentFrom?: number;
}

export function Display({ as: As = "h2", size, className, lines, accentFrom, children, ...props }: DisplayProps) {
  return (
    <As className={cn(displayVariants({ size }), className)} {...props}>
      {lines
        ? lines.map((line, i) => (
            <span key={i} className={cn("block", accentFrom !== undefined && i >= accentFrom && "text-gold")}>
              {line}
            </span>
          ))
        : children}
    </As>
  );
}

/** Lime-tinted inline word inside a headline. */
export function Accent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-gold", className)}>{children}</span>;
}

export function Eyebrow({
  children,
  className,
  live,
  tone = "gold",
}: {
  children: React.ReactNode;
  className?: string;
  live?: boolean;
  tone?: "gold" | "paper" | "ink";
}) {
  return (
    <p
      className={cn(
        "mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em]",
        tone === "gold" ? "text-gold" : tone === "paper" ? "text-paper" : "text-ink/60",
        className,
      )}
    >
      {live ? <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full tc-live", tone === "paper" ? "bg-paper" : "bg-gold")} /> : null}
      {children}
    </p>
  );
}

export function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-xl text-[17px] leading-relaxed text-ink/75", className)}>{children}</p>;
}

/** Mono label (stat labels, table headers): 11px, 0.2em. */
export function Label({ children, className, as: As = "span" }: { children: React.ReactNode; className?: string; as?: "span" | "p" | "div" | "dt" }) {
  return <As className={cn("font-mono text-[11px] uppercase tracking-[0.2em] text-ink/75", className)}>{children}</As>;
}

/** Micro: chips, tags, card meta. */
export function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[10px] uppercase tracking-[0.1em] text-ink/60", className)}>{children}</span>;
}

/** Big lime stat number. */
export function Stat({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("tc-display tabular block text-[3.3rem] text-gold", className)}>{children}</span>;
}
