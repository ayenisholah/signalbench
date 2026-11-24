import { lastCloseAt } from "../schedule";
import type { Signal } from "../types";
import type { Strategy } from "./strategy";

/**
 * Trend filter on closes sampled at each anchor: long while the fast moving
 * average is above the slow one, flat otherwise.
 */
export function smaCross(fast: number, slow: number): Strategy {
  if (fast >= slow) throw new Error("fast must be shorter than slow");
  return {
    id: `sma-${fast}-${slow}`,
    name: `SMA ${fast}/${slow}`,
    description: `Long while the ${fast}-period average of 4h closes is above the ${slow}-period average, flat otherwise.`,
    signals({ candles, anchors, config }) {
      const out: Signal[] = [];
      for (const asset of Object.keys(config.weights)) {
        const closes: number[] = [];
        let prev: number | undefined;
        for (const t of anchors) {
          const c = lastCloseAt(candles[asset]!, t, config.candleSeconds);
          if (c === undefined) continue;
          closes.push(c);
          if (closes.length < slow) continue;
          const avg = (n: number) => closes.slice(-n).reduce((s, x) => s + x, 0) / n;
          const target = avg(fast) > avg(slow) ? 1 : 0;
          if (target !== prev) out.push({ t, asset, target });
          prev = target;
        }
      }
      return out;
    },
  };
}
