import type { Strategy } from "./strategy";

/** Fully long every asset from the first anchor and never sells. The benchmark every other run is compared with. */
export const buyAndHold: Strategy = {
  id: "buy-and-hold",
  name: "Buy and hold",
  description: "Fully long each sleeve from the first anchor, never sells. The benchmark.",
  signals({ anchors, config }) {
    const t = anchors[0];
    if (t === undefined) return [];
    return Object.keys(config.weights).map((asset) => ({ t, asset, target: 1 }));
  },
};
