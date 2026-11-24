import * as React from "react";
import { cn } from "@/lib/utils";
import { Display, Eyebrow, Lead } from "./typography";

/** KEPT A5: the exact section container. */
export const CONTAINER = "mx-auto w-full max-w-[1320px] px-5 md:px-10";
export const SECTION_PAD = { section: "py-20 md:py-28", hero: "py-16", strip: "py-12", page: "py-10 md:py-14", none: "" } as const;

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  pad?: keyof typeof SECTION_PAD;
  grid?: boolean;
  rule?: boolean;
  /** Lime band (bg-gold text-paper + dark grid). */
  band?: boolean;
  inner?: string;
}

export function Section({ pad = "section", grid, rule = true, band, className, inner, children, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        "relative w-full",
        rule && !band && "border-t border-ink/10",
        grid && !band && "tc-grid",
        band && "bg-gold tc-grid-dark text-paper",
        className,
      )}
      {...props}
    >
      <div className={cn(CONTAINER, SECTION_PAD[pad], inner)}>{children}</div>
    </section>
  );
}

export interface SectionHeaderProps {
  eyebrow: React.ReactNode;
  title?: React.ReactNode;
  lines?: string[];
  accentFrom?: number;
  intro?: React.ReactNode;
  centered?: boolean;
  as?: "h1" | "h2";
  size?: "xl" | "lg" | "md";
  live?: boolean;
  tone?: "gold" | "paper";
  actions?: React.ReactNode;
  className?: string;
}

/** Eyebrow → H2, with optional right-aligned intro (desktop) or centered variant. */
export function SectionHeader({
  eyebrow,
  title,
  lines,
  accentFrom,
  intro,
  centered,
  as = "h2",
  size = "lg",
  live,
  tone = "gold",
  actions,
  className,
}: SectionHeaderProps) {
  const heading = (
    <div className={cn(centered && "mx-auto text-center")}>
      <Eyebrow live={live} tone={tone} className={cn(centered && "justify-center")}>
        {eyebrow}
      </Eyebrow>
      <Display as={as} size={size} lines={lines} accentFrom={accentFrom}>
        {title}
      </Display>
    </div>
  );
  if (centered)
    return (
      <div className={cn("mb-12 flex flex-col items-center gap-5 text-center", className)}>
        {heading}
        {intro ? <Lead className="mx-auto">{intro}</Lead> : null}
        {actions}
      </div>
    );
  return (
    <div className={cn("mb-10 grid gap-6 md:mb-14 md:grid-cols-[1fr_auto] md:items-end", className)}>
      {heading}
      {intro || actions ? (
        <div className="flex flex-col gap-4 md:items-end">
          {intro ? <p className={cn("max-w-sm text-ink/75", tone === "paper" && "text-paper/80")}>{intro}</p> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Page header for app pages: eyebrow + H1 display-lg + lead + actions. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  live,
  children,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  live?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div>
        <Eyebrow live={live}>{eyebrow}</Eyebrow>
        <Display as="h1" size="lg">
          {title}
        </Display>
        {lead ? <Lead className="mt-4">{lead}</Lead> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
