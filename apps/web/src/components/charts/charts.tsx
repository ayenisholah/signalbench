"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLOR } from "@/lib/design/tokens";
import { month as fmtMonth, pct, shortDay, utc } from "@/lib/format";

/** Axis text in the system's mono micro style (agentfloor charts.tsx). */
const AXIS = { fill: "rgb(241 239 230 / 0.5)", fontSize: 10, fontFamily: "var(--font-space-mono)" };
const MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="border-2 border-ink/15 bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]">
      <p className="mb-1 text-ink/60">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color ? <span aria-hidden className="inline-block h-2 w-2" style={{ backgroundColor: r.color }} /> : null}
          <span className="text-ink/70">{r.label}</span>
          <span className="ml-auto pl-4 tabular text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function BandSweep() {
  return (
    <span
      aria-hidden
      className="tc-band-sweep pointer-events-none absolute inset-y-0 left-0 w-[18%] bg-gradient-to-r from-transparent via-gold/10 to-transparent"
    />
  );
}

export interface LineSeries {
  id: string;
  name: string;
  color: string;
  /** Emphasised series draws thicker and on top. */
  primary?: boolean;
}

/**
 * Growth of 100 for several runs on a shared time axis. Rows are
 * `{ t, [seriesId]: value }`.
 */
export function EquityChart({ rows, series, height = 320, label }: { rows: Record<string, number>[]; series: LineSeries[]; height?: number; label: string }) {
  const ordered = [...series].sort((a, b) => Number(!!a.primary) - Number(!!b.primary));
  const first = rows[0];
  const last = rows[rows.length - 1];
  return (
    <figure>
      <div className="relative overflow-hidden" style={{ height }} role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={MARGIN}>
            <CartesianGrid stroke={COLOR.grid} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={shortDay}
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: COLOR.axis }}
              minTickGap={48}
            />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} tickFormatter={(v: number) => v.toFixed(0)} />
            <ReferenceLine y={100} stroke={COLOR.muted} strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: "rgb(203 254 66 / 0.4)" }}
              content={({ active, payload, label: t }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={utc(Number(t))}
                    rows={series.map((s) => {
                      const v = payload.find((p) => p.dataKey === s.id)?.value;
                      return { label: s.name, value: typeof v === "number" ? v.toFixed(2) : "—", color: s.color };
                    })}
                  />
                ) : null
              }
            />
            {ordered.map((s) => (
              <Line
                key={s.id}
                dataKey={s.id}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.primary ? 2.5 : 1.5}
                strokeOpacity={s.primary ? 1 : 0.8}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <BandSweep />
      </div>
      {first && last ? (
        <table className="sr-only">
          <caption>{label}: value of 100 invested, start and end of the window</caption>
          <thead>
            <tr>
              <th scope="col">Strategy</th>
              <th scope="col">{utc(first.t!)}</th>
              <th scope="col">{utc(last.t!)}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.name}</th>
                <td>{first[s.id]?.toFixed(2)}</td>
                <td>{last[s.id]?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}

/** Underwater curve: distance below the running peak, always <= 0. */
export function DrawdownChart({ rows, color, height = 220, label }: { rows: { t: number; d: number }[]; color: string; height?: number; label: string }) {
  const worst = rows.reduce((m, r) => Math.min(m, r.d), 0);
  const id = React.useId().replace(/:/g, "");
  return (
    <figure>
      <div className="relative overflow-hidden" style={{ height }} role="img" aria-label={`${label}. Deepest point ${pct(worst)}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={MARGIN}>
            <defs>
              <linearGradient id={`dd-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.05} />
                <stop offset="100%" stopColor={color} stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLOR.grid} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={shortDay}
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: COLOR.axis }}
              minTickGap={48}
            />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} domain={["dataMin", 0]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip
              cursor={{ stroke: "rgb(203 254 66 / 0.4)" }}
              content={({ active, payload, label: t }) =>
                active && payload?.length ? <TooltipBox title={utc(Number(t))} rows={[{ label: "Drawdown", value: pct(Number(payload[0]!.value)) }]} /> : null
              }
            />
            <Area dataKey="d" stroke={color} strokeWidth={1.5} fill={`url(#dd-${id})`} isAnimationActive={false} type="linear" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/**
 * Monthly returns: square bars, lime up and red down, with the keyboard
 * readout and hidden data table from agentfloor's BarSeries.
 */
export function MonthlyBars({ rows, height = 220, label }: { rows: { month: string; ret: number }[]; height?: number; label: string }) {
  const [focus, setFocus] = React.useState<number | null>(null);
  const onKey = (e: React.KeyboardEvent) => {
    if (!rows.length) return;
    const last = rows.length - 1;
    const map: Record<string, () => number | null> = {
      ArrowRight: () => Math.min(last, (focus ?? -1) + 1),
      ArrowLeft: () => Math.max(0, (focus ?? rows.length) - 1),
      Home: () => 0,
      End: () => last,
      Escape: () => null,
    };
    const next = map[e.key];
    if (next) {
      e.preventDefault();
      setFocus(next());
    }
  };
  const f = focus !== null ? rows[focus] : null;
  return (
    <figure>
      <div
        tabIndex={0}
        onKeyDown={onKey}
        aria-label={`${label}. Use arrow keys to read values.`}
        className="relative overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-gold"
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={MARGIN}>
            <CartesianGrid stroke={COLOR.grid} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={fmtMonth}
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: COLOR.axis }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <ReferenceLine y={0} stroke={COLOR.axis} />
            <Tooltip
              cursor={{ fill: "rgb(203 254 66 / 0.06)" }}
              content={({ active, payload, label: m }) =>
                active && payload?.length ? (
                  <TooltipBox title={fmtMonth(String(m))} rows={[{ label: "Return", value: pct(Number(payload[0]!.value)) }]} />
                ) : null
              }
            />
            <Bar dataKey="ret" radius={0} isAnimationActive={false}>
              {rows.map((r, i) => (
                <Cell key={r.month} fill={r.ret >= 0 ? COLOR.gold : COLOR.destructive} fillOpacity={focus === null || focus === i ? 1 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <BandSweep />
      </div>
      <figcaption className="mt-2 h-5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60" aria-live="polite">
        {f ? `${fmtMonth(f.month)} · ${pct(f.ret)}` : "Focus the chart and use ← → to read values"}
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{fmtMonth(r.month)}</th>
              <td>{pct(r.ret)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
