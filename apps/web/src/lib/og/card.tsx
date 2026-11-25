import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { THEME } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

/** The fonts ship with @fontsource; workspaces hoist it to the repo root, so look there as well as next to the app. */
async function font(pkg: string, file: string): Promise<ArrayBuffer> {
  const roots = [join(process.cwd(), "node_modules"), join(process.cwd(), "../../node_modules")];
  for (const root of roots) {
    try {
      const buf = await readFile(join(root, "@fontsource", pkg, "files", file));
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch {
      // try the next root
    }
  }
  throw new Error(`font not found: ${pkg}/${file}`);
}

export interface CardStat {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat";
}

/** 1200×630 share card in the dashboard's look: dark paper, lime accent, Space Grotesk and Space Mono. */
export async function shareCard({
  eyebrow,
  title,
  subtitle,
  stats = [],
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  stats?: CardStat[];
  footer: string;
}) {
  const [display, mono] = await Promise.all([
    font("space-grotesk", "space-grotesk-latin-700-normal.woff"),
    font("space-mono", "space-mono-latin-400-normal.woff"),
  ]);
  const tone = (t?: CardStat["tone"]) => (t === "up" ? THEME.gold : t === "down" ? THEME.red : THEME.ink);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: THEME.paper,
        color: THEME.ink,
        fontFamily: "Mono",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 56,
            height: 56,
            background: THEME.gold,
            color: THEME.paper,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          SB
        </div>
        <div style={{ display: "flex", fontFamily: "Display", fontSize: 30, letterSpacing: -0.5 }}>
          SIGNAL<span style={{ color: THEME.gold }}>BENCH</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 20, letterSpacing: 4, textTransform: "uppercase", color: "rgba(241,239,230,0.6)" }}>{eyebrow}</div>
        <div style={{ fontFamily: "Display", fontSize: 76, lineHeight: 1, letterSpacing: -2, textTransform: "uppercase", maxWidth: 1060 }}>{title}</div>
        <div style={{ fontSize: 22, color: "rgba(241,239,230,0.75)", maxWidth: 1000 }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid rgba(241,239,230,0.15)", paddingTop: 24 }}>
        <div style={{ display: "flex", gap: 48 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase", color: "rgba(241,239,230,0.55)" }}>{s.label}</div>
              <div style={{ fontFamily: "Display", fontSize: 40, color: tone(s.tone) }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase", color: "rgba(241,239,230,0.55)" }}>{footer}</div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Display", data: display, weight: 700, style: "normal" },
        { name: "Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}

export const toneOf = (x: number): CardStat["tone"] => (x > 0 ? "up" : x < 0 ? "down" : "flat");
