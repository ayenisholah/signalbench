import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SegmentItem {
  value: string;
  label: React.ReactNode;
  href?: string;
  count?: number;
}

const ITEM = "inline-flex items-center gap-2 px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors whitespace-nowrap";
const ACTIVE = "bg-gold text-paper";
const IDLE = "text-ink/65 hover:text-ink";

/**
 * Segmented control (KEPT A7). Link-based when items have href (URL state,
 * works without JS); button-based with onChange otherwise.
 */
export function Segmented({
  items,
  value,
  onChange,
  label,
  className,
  size = "md",
}: {
  items: SegmentItem[];
  value: string;
  onChange?: (v: string) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex flex-wrap border-2 border-ink/15", className)}>
      {items.map((it) => {
        const active = it.value === value;
        const cls = cn(ITEM, size === "sm" && "px-2.5 py-1.5 text-[10px]", active ? ACTIVE : IDLE);
        const content = (
          <>
            {it.label}
            {it.count !== undefined ? <span className={cn("tabular", active ? "text-paper/70" : "text-ink/40")}>{it.count}</span> : null}
          </>
        );
        return it.href ? (
          <Link key={it.value} href={it.href} role="radio" aria-checked={active} className={cls} scroll={false}>
            {content}
          </Link>
        ) : (
          <button key={it.value} type="button" role="radio" aria-checked={active} className={cls} onClick={onChange ? () => onChange(it.value) : undefined}>
            {content}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined link tabs for page-level navigation (OVERVIEW / HIRES / TEMPLATES). */
export function TabNav({ items, value, label, className }: { items: SegmentItem[]; value: string; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("flex gap-6 overflow-x-auto border-b border-ink/10", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Link
            key={it.value}
            href={it.href ?? "#"}
            aria-current={active ? "page" : undefined}
            scroll={false}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors",
              active ? "border-gold text-gold" : "border-transparent text-ink/60 hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined ? <span className="ml-2 text-ink/40">{it.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Pill filter row (event types, modes) — link-based. */
export function PillRow({
  items,
  value,
  label,
  className,
}: {
  items: (SegmentItem & { colorClass?: string })[];
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Link
            key={it.value}
            href={it.href ?? "#"}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={cn(
              "border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              active ? "border-gold bg-gold text-paper" : cn("border-ink/20 hover:border-ink/50", it.colorClass ?? "text-ink/70"),
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
