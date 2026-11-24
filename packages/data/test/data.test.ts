import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BitstampClient, type FetchLike } from "../src/bitstamp-client";
import { mergeCandles, readCache, writeCache } from "../src/cache";

function ohlc(ts: number[]) {
  return {
    data: {
      pair: "BTC/USD",
      ohlc: ts.map((t) => ({ timestamp: String(t), open: "1", high: "2", low: "0.5", close: "1.5", volume: "3" })),
    },
  };
}

function fakeFetch(pages: Array<{ status: number; body?: unknown }>) {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    const p = pages.shift() ?? { status: 200, body: ohlc([]) };
    return { ok: p.status < 400, status: p.status, json: async () => p.body };
  };
  return { fetch, calls };
}

const noSleep = async () => {};

describe("BitstampClient", () => {
  it("pages forward until the range is covered", async () => {
    const { fetch, calls } = fakeFetch([
      { status: 200, body: ohlc([0, 900, 1800]) },
      { status: 200, body: ohlc([2700, 3600]) },
    ]);
    const c = new BitstampClient({ fetch, sleep: noSleep });
    const bars = await c.ohlcRange("btcusd", 900, 0, 3600);
    expect(bars.map((b) => b.t)).toEqual([0, 900, 1800, 2700]);
    expect(calls[1]).toContain("start=2700");
    expect(bars[0]).toEqual({ t: 0, o: 1, h: 2, l: 0.5, c: 1.5, v: 3 });
  });

  it("skips an empty stretch (before listing) one page-width at a time", async () => {
    const width = 1000 * 900;
    const { fetch, calls } = fakeFetch([
      { status: 200, body: ohlc([]) },
      { status: 200, body: ohlc([]) },
      { status: 200, body: ohlc([2 * width, 2 * width + 900]) },
    ]);
    const bars = await new BitstampClient({ fetch, sleep: noSleep }).ohlcRange("paxgusd", 900, 0, 2 * width + 1800);
    expect(bars.map((b) => b.t)).toEqual([2 * width, 2 * width + 900]);
    expect(calls.map((u) => new URL(u).searchParams.get("start"))).toEqual(["0", String(width), String(2 * width)]);
  });

  it("ends when the range is exhausted even if every page is empty", async () => {
    const { fetch, calls } = fakeFetch([]);
    expect(await new BitstampClient({ fetch, sleep: noSleep }).ohlcRange("btcusd", 900, 0, 3 * 1000 * 900)).toEqual([]);
    expect(calls).toHaveLength(3);
  });

  it("retries 429 and 5xx, then succeeds", async () => {
    const { fetch, calls } = fakeFetch([{ status: 429 }, { status: 503 }, { status: 200, body: ohlc([0]) }]);
    const bars = await new BitstampClient({ fetch, sleep: noSleep }).ohlcPage("btcusd", 900, 0);
    expect(bars).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });

  it("gives up after the retry budget", async () => {
    const { fetch } = fakeFetch([{ status: 500 }, { status: 500 }]);
    await expect(new BitstampClient({ fetch, sleep: noSleep, retries: 2 }).ohlcPage("btcusd", 900, 0)).rejects.toThrow(/HTTP 500/);
  });

  it("does not retry a 4xx client error", async () => {
    const { fetch, calls } = fakeFetch([{ status: 404 }, { status: 200, body: ohlc([0]) }]);
    await expect(new BitstampClient({ fetch, sleep: noSleep }).ohlcPage("nope", 900, 0)).rejects.toThrow(/HTTP 404/);
    expect(calls).toHaveLength(1);
  });
});

describe("candle cache", () => {
  let dir: string | undefined;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("merges by open time with newer bars winning", () => {
    const a = [{ t: 0, o: 1, h: 1, l: 1, c: 1, v: 0 }, { t: 900, o: 1, h: 1, l: 1, c: 1, v: 0 }];
    const b = [{ t: 900, o: 2, h: 2, l: 2, c: 2, v: 0 }, { t: 1800, o: 3, h: 3, l: 3, c: 3, v: 0 }];
    expect(mergeCandles(a, b).map((x) => [x.t, x.c])).toEqual([
      [0, 1],
      [900, 2],
      [1800, 3],
    ]);
  });

  it("round-trips through disk and returns null when missing", async () => {
    dir = await mkdtemp(join(tmpdir(), "sb-cache-"));
    expect(await readCache(dir, "btcusd", 900)).toBeNull();
    await writeCache(dir, { pair: "btcusd", step: 900, fetchedAt: "2026-01-01T00:00:00Z", candles: [{ t: 0, o: 1, h: 1, l: 1, c: 1, v: 0 }] });
    expect((await readCache(dir, "btcusd", 900))?.candles).toHaveLength(1);
  });
});
