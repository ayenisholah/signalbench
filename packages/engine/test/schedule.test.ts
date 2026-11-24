import { describe, expect, it } from "vitest";
import { anchorsBetween, barsInWindow, ceilToAnchor, lastCloseAt } from "../src/schedule";
import { flat } from "./helpers";

const H4 = 4 * 3600;

describe("schedule", () => {
  it("anchors sit on 4h UTC boundaries", () => {
    const start = Date.UTC(2026, 0, 1, 1, 30) / 1000;
    const end = Date.UTC(2026, 0, 2, 0, 0) / 1000;
    const hours = anchorsBetween(start, end, H4).map((t) => new Date(t * 1000).getUTCHours());
    expect(hours).toEqual([4, 8, 12, 16, 20, 0]);
  });

  it("ceilToAnchor keeps exact anchors", () => {
    expect(ceilToAnchor(H4 * 3, H4)).toBe(H4 * 3);
    expect(ceilToAnchor(H4 * 3 + 1, H4)).toBe(H4 * 4);
  });

  it("lastCloseAt only uses bars that have closed", () => {
    const c = [flat(0, 1), flat(900, 2), flat(1800, 3)];
    expect(lastCloseAt(c, 900, 900)).toBe(1);
    expect(lastCloseAt(c, 1799, 900)).toBe(1);
    expect(lastCloseAt(c, 1800, 900)).toBe(2);
    expect(lastCloseAt(c, 899, 900)).toBeUndefined();
  });

  it("barsInWindow is half-open", () => {
    const c = [flat(0, 1), flat(900, 2), flat(1800, 3)];
    expect(barsInWindow(c, 900, 1800).map((b) => b.t)).toEqual([900]);
  });
});
