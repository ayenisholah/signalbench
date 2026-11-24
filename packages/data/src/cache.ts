import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { CandleSchema, type Candle } from "@signalbench/engine";

const CacheFile = z.object({
  pair: z.string(),
  step: z.number(),
  fetchedAt: z.string(),
  candles: z.array(CandleSchema),
});
export type CandleCache = z.infer<typeof CacheFile>;

export function cachePath(dir: string, pair: string, step: number): string {
  return join(dir, `${pair}-${step / 60}m.json`);
}

export async function readCache(dir: string, pair: string, step: number): Promise<CandleCache | null> {
  try {
    return CacheFile.parse(JSON.parse(await readFile(cachePath(dir, pair, step), "utf8")));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Merges bars by open time (newer wins), sorted oldest first. */
export function mergeCandles(a: readonly Candle[], b: readonly Candle[]): Candle[] {
  const byT = new Map<number, Candle>();
  for (const c of a) byT.set(c.t, c);
  for (const c of b) byT.set(c.t, c);
  return [...byT.values()].sort((x, y) => x.t - y.t);
}

/** Writes through a temp file and a rename, so a crash never leaves a half-written cache. */
export async function writeCache(dir: string, cache: CandleCache): Promise<string> {
  const path = cachePath(dir, cache.pair, cache.step);
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(cache));
  await rename(tmp, path);
  return path;
}
