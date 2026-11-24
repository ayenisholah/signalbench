/**
 * Pulls 15m bars from Bitstamp's public API into data/candles/, extending an
 * existing cache instead of refetching it. Keeps HISTORY_DAYS of history.
 *
 *   npm run fetch                      # 365 days
 *   SB_HISTORY_DAYS=90 npm run fetch
 */
import { BitstampClient, mergeCandles, readCache, writeCache } from "@signalbench/data";
import { CANDLE_DIR, CANDLE_SECONDS, HISTORY_DAYS, MARKETS } from "./markets";

const client = new BitstampClient();
const now = Math.floor(Date.now() / 1000);
/** Only keep bars that have closed. */
const to = Math.floor(now / CANDLE_SECONDS) * CANDLE_SECONDS;
const horizon = to - HISTORY_DAYS * 86_400;

for (const m of MARKETS) {
  const cached = await readCache(CANDLE_DIR, m.pair, CANDLE_SECONDS);
  const lastCached = cached?.candles.at(-1)?.t;
  const from = lastCached !== undefined && lastCached >= horizon ? lastCached + CANDLE_SECONDS : horizon;
  console.info(`${m.pair}: fetching ${new Date(from * 1000).toISOString()} → ${new Date(to * 1000).toISOString()}`);

  const fresh = await client.ohlcRange(m.pair, CANDLE_SECONDS, from, to, (n, upTo) => {
    process.stdout.write(`\r  ${n} bars, up to ${new Date(upTo * 1000).toISOString()}   `);
  });
  process.stdout.write("\n");

  const candles = mergeCandles(cached?.candles ?? [], fresh).filter((c) => c.t >= horizon && c.t < to);
  if (candles.length === 0) throw new Error(`${m.pair}: no candles fetched`);
  const path = await writeCache(CANDLE_DIR, { pair: m.pair, step: CANDLE_SECONDS, fetchedAt: new Date().toISOString(), candles });
  console.info(`  ${candles.length} bars (${fresh.length} new) → ${path}`);
}
