import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Generic DataTable<T> (KEPT A7 tables): no zebra, label-style header,
 * ink/10 rules, right-aligned numbers. Under md it renders stacked cards.
 */
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hide in the stacked mobile card (e.g. redundant columns). */
  hideOnMobile?: boolean;
  /** Show as the mobile card title (first such column). */
  primary?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  empty?: React.ReactNode;
  className?: string;
  onRowHref?: (row: T) => string | undefined;
}

const TH = "text-left font-mono text-[11px] uppercase tracking-[0.2em] text-ink/75 font-normal py-3 px-3 first:pl-0 last:pr-0";
const TD = "py-4 px-3 align-top text-[14px] first:pl-0 last:pr-0";

export function DataTable<T>({ columns, rows, rowKey, caption, empty, className }: DataTableProps<T>) {
  if (rows.length === 0) return <>{empty ?? null}</>;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <div className={className}>
      {/* Desktop table */}
      <table className="hidden w-full border-collapse md:table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-ink/10">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn(TH, c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r)} className="border-b border-ink/10 transition-colors hover:bg-ink/[0.03]">
              {columns.map((c) => (
                <td key={c.key} className={cn(TD, c.align === "right" && "text-right tabular", c.align === "center" && "text-center", c.className)}>
                  {c.cell(r, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile stacked cards */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label={caption}>
        {rows.map((r, i) => (
          <li key={rowKey(r)} className="border-2 border-ink/15 p-4">
            <div className="mb-3">{primary.cell(r, i)}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {columns
                .filter((c) => c !== primary && !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key}>
                    <dt className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">{c.header}</dt>
                    <dd className="text-[14px]">{c.cell(r, i)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Simple key/value rows for detail rails. */
export function KeyValue({ rows, className }: { rows: { label: React.ReactNode; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-ink/10", className)}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-3 text-[14px]">
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55 pt-0.5">{r.label}</dt>
          <dd className="text-right text-ink/90 break-all">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
