import type { Signal } from "../types";
import type { Strategy } from "./strategy";

/** Small, fast, seedable PRNG so a "random" run is identical on every build. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Picks long or short with equal odds at every anchor. A skill-free baseline:
 * anything worth running should clearly beat it after fees.
 */
export function coinFlip(seed = 42): Strategy {
  return {
    id: `coin-flip-${seed}`,
    name: "Coin flip",
    description: `Long or short with equal odds at every anchor (seed ${seed}). The no-skill baseline.`,
    signals({ anchors, config }) {
      const rand = mulberry32(seed);
      const out: Signal[] = [];
      for (const t of anchors) {
        for (const asset of Object.keys(config.weights)) out.push({ t, asset, target: rand() < 0.5 ? 1 : -1 });
      }
      return out;
    },
  };
}
