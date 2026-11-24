/** The markets a default run trades, keyed by engine symbol. */
export const MARKETS = [
  { asset: "PAXGUSD", pair: "paxgusd", label: "Gold (PAXG/USD)", weight: 0.7 },
  { asset: "BTCUSD", pair: "btcusd", label: "Bitcoin (BTC/USD)", weight: 0.3 },
] as const;

export const CANDLE_SECONDS = 900;
export const CANDLE_DIR = new URL("../data/candles/", import.meta.url).pathname;
export const RUNS_DIR = new URL("../apps/web/data/", import.meta.url).pathname;
export const HISTORY_DAYS = Number(process.env.SB_HISTORY_DAYS ?? 365);
