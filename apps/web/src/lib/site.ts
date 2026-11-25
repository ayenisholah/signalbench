import type { Metadata } from "next";

/** Site-wide identity, used by metadata, the sitemap, structured data and the Open Graph images. */
export const SITE_URL = (process.env.SITE_URL ?? "https://signalbench.sholaayeni.xyz").replace(/\/$/, "");
export const SITE_NAME = "SignalBench";
export const TAGLINE = "Honest fills, real metrics";
export const DESCRIPTION =
  "Backtest trading signals with honest fills: 2 bps limit orders on a fixed 4-hour UTC schedule, never chased. Return, Sharpe, drawdown and fill rate for a 70/30 gold/BTC portfolio on public Bitstamp data.";
export const KEYWORDS = [
  "backtesting",
  "trading signals",
  "limit orders",
  "fill model",
  "Sharpe ratio",
  "max drawdown",
  "bitcoin",
  "PAXG",
  "gold",
  "quant",
  "Bitstamp",
];
export const REPO_URL = "https://github.com/ayenisholah/signalbench";
export const AUTHOR = { name: "Shola Ayeni", url: "https://github.com/ayenisholah" };
/** The root share card, served by app/opengraph-image.tsx. */
export const DEFAULT_SHARE_IMAGE = {
  url: "/opengraph-image",
  alt: `${SITE_NAME}: ${TAGLINE}. A limit-order signal backtester for a 70/30 gold/BTC portfolio.`,
};
export const THEME = { paper: "#0f0f0f", ink: "#f1efe6", gold: "#cbfe42", red: "#e6443d" } as const;

/**
 * Full per-page metadata. Next replaces a parent's `openGraph` and `twitter` objects rather than merging them, so every page
 * restates siteName, locale and card type here instead of losing them.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  absoluteTitle = false,
  image,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  absoluteTitle?: boolean;
  /**
   * Share image for a page with no `opengraph-image` of its own. Setting `openGraph` drops the image inherited from the root
   * segment, so such pages point back at it here.
   */
  image?: { url: string; alt: string };
}): Metadata {
  const images = image ? [{ ...image, width: 1200, height: 630, type: "image/png" }] : undefined;
  const shareTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, locale: "en_US", url: path, title: shareTitle, description, images },
    twitter: { card: "summary_large_image", title: shareTitle, description, images },
  };
}
