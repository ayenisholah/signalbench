import { z } from "zod";
import type { Signal } from "../types";
import type { Strategy } from "../strategies/strategy";

/**
 * Describes how to read someone else's signal file. Field paths use dots
 * ("meta.time"). Only the time field and one of targetField or sideField are
 * required.
 */
export const SignalMappingSchema = z.object({
  /** Dot path to the array of records; omit if the file is the array itself. */
  recordsPath: z.string().optional(),
  timeField: z.string(),
  timeUnit: z.enum(["s", "ms", "iso"]).default("s"),
  /** Dot path to the asset symbol in each record. */
  assetField: z.string().optional(),
  /** Asset used when records carry none (one file per asset). */
  asset: z.string().optional(),
  /** Rename symbols from the file to engine symbols, e.g. { "XAUUSD": "PAXGUSD" }. */
  assetMap: z.record(z.string()).default({}),
  /** Dot path to a numeric exposure in [-1, 1]. */
  targetField: z.string().optional(),
  /** Dot path to a text side such as "BUY", "SELL", "FLAT". */
  sideField: z.string().optional(),
  /** Side text to exposure; matching ignores case. */
  sideMap: z.record(z.number().min(-1).max(1)).default({ buy: 1, long: 1, sell: -1, short: -1, flat: 0, close: 0, hold: 0 }),
});
export type SignalMapping = z.input<typeof SignalMappingSchema>;

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function toSeconds(v: unknown, unit: "s" | "ms" | "iso"): number {
  if (unit === "iso") {
    const ms = Date.parse(String(v));
    if (Number.isNaN(ms)) throw new Error(`Bad ISO time: ${String(v)}`);
    return Math.floor(ms / 1000);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Bad time: ${String(v)}`);
  return Math.floor(unit === "ms" ? n / 1000 : n);
}

/** Parses a signal file with a mapping. Throws with the record index on the first bad record. */
export function parseSignalFile(json: unknown, mappingInput: SignalMapping): Signal[] {
  const m = SignalMappingSchema.parse(mappingInput);
  if (!m.targetField && !m.sideField) throw new Error("Mapping needs targetField or sideField");
  const records = m.recordsPath ? get(json, m.recordsPath) : json;
  if (!Array.isArray(records)) throw new Error("Signal records are not an array");
  const sideMap = Object.fromEntries(Object.entries(m.sideMap).map(([k, v]) => [k.toLowerCase(), v]));

  return records.map((r, i) => {
    try {
      const rawAsset = m.assetField ? String(get(r, m.assetField)) : m.asset;
      if (!rawAsset) throw new Error("no asset");
      const asset = m.assetMap[rawAsset] ?? rawAsset;
      let target: number;
      if (m.targetField) {
        target = Number(get(r, m.targetField));
      } else {
        const side = String(get(r, m.sideField!)).toLowerCase();
        const mapped = sideMap[side];
        if (mapped === undefined) throw new Error(`unknown side "${side}"`);
        target = mapped;
      }
      if (!Number.isFinite(target) || target < -1 || target > 1) throw new Error(`target ${target} outside [-1, 1]`);
      return { t: toSeconds(get(r, m.timeField), m.timeUnit), asset, target };
    } catch (e) {
      throw new Error(`Signal record ${i}: ${(e as Error).message}`);
    }
  });
}

/** Wraps parsed external signals as a strategy so they run through the same engine as the baselines. */
export function externalSignals(id: string, name: string, signals: readonly Signal[]): Strategy {
  return {
    id,
    name,
    description: "Signals loaded from a JSON file through the generic adapter.",
    signals: ({ config }) => signals.filter((s) => s.asset in config.weights),
  };
}
