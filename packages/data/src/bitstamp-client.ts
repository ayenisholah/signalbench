import { z } from "zod";
import type { Candle } from "@signalbench/engine";

const BASE_URL = "https://www.bitstamp.net/api/v2";
/** Bitstamp's maximum bars per OHLC request. */
export const MAX_LIMIT = 1000;

const OhlcResponse = z.object({
  data: z.object({
    pair: z.string(),
    ohlc: z.array(
      z.object({
        timestamp: z.coerce.number(),
        open: z.coerce.number(),
        high: z.coerce.number(),
        low: z.coerce.number(),
        close: z.coerce.number(),
        volume: z.coerce.number(),
      }),
    ),
  }),
});

export type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface BitstampClientOptions {
  fetch?: FetchLike;
  /** Attempts per request, including the first. */
  retries?: number;
  /** First backoff delay in ms; doubles each retry. */
  backoffMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

class NonRetryableError extends Error {}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class BitstampClient {
  private readonly fetch: FetchLike;
  private readonly retries: number;
  private readonly backoffMs: number;
  private readonly timeoutMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: BitstampClientOptions = {}) {
    this.fetch = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.retries = opts.retries ?? 5;
    this.backoffMs = opts.backoffMs ?? 500;
    this.timeoutMs = opts.timeoutMs ?? 20_000;
    this.sleep = opts.sleep ?? wait;
  }

  /** One page of bars starting at `start` (inclusive), oldest first. Retries 429 and 5xx with exponential backoff. */
  async ohlcPage(pair: string, step: number, start: number, limit = MAX_LIMIT): Promise<Candle[]> {
    const url = `${BASE_URL}/ohlc/${encodeURIComponent(pair)}/?step=${step}&limit=${limit}&start=${start}`;
    let lastError: unknown;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      if (attempt > 0) await this.sleep(this.backoffMs * 2 ** (attempt - 1));
      try {
        const res = await this.fetch(url, { signal: AbortSignal.timeout(this.timeoutMs), headers: { accept: "application/json" } });
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(`Bitstamp ${pair} HTTP ${res.status}`);
          continue;
        }
        if (!res.ok) throw new NonRetryableError(`Bitstamp ${pair} HTTP ${res.status}`);
        const body = OhlcResponse.parse(await res.json());
        return body.data.ohlc
          .map((b) => ({ t: b.timestamp, o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume }))
          .filter((b) => b.t >= start)
          .sort((a, b) => a.t - b.t);
      } catch (e) {
        // Client errors and malformed payloads won't fix themselves; network errors and timeouts might.
        if (e instanceof NonRetryableError || e instanceof z.ZodError) throw e;
        lastError = e;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Every bar in [from, to), paging forward. Bitstamp returns an empty page
   * when `start` is before a pair's listing or inside a gap, so an empty page
   * skips ahead one page-width instead of ending the walk. `start` grows on
   * every iteration, so the loop always ends.
   */
  async ohlcRange(pair: string, step: number, from: number, to: number, onPage?: (bars: number, upTo: number) => void): Promise<Candle[]> {
    const out: Candle[] = [];
    let start = from;
    while (start < to) {
      const page = await this.ohlcPage(pair, step, start);
      const fresh = page.filter((b) => b.t >= start && b.t < to);
      start = fresh.length ? Math.max(fresh[fresh.length - 1]!.t + step, start + step) : start + MAX_LIMIT * step;
      out.push(...fresh);
      onPage?.(out.length, Math.min(start, to));
    }
    return out;
  }
}
