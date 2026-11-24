import type { Metadata, Viewport } from "next";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./globals.css";
import { Header } from "@/components/shell/header";
import { Footer } from "@/components/shell/footer";
import { loadIndex } from "@/lib/runs";

const SITE_URL = process.env.SITE_URL ?? "https://signalbench.sholaayeni.xyz";
const DESCRIPTION =
  "Backtest trading signals with honest fills: 2 bps limit orders on a fixed 4-hour UTC schedule, never chased. Return, Sharpe and drawdown for a 70/30 gold/BTC portfolio.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SignalBench · Honest fills, real metrics", template: "%s · SignalBench" },
  description: DESCRIPTION,
  applicationName: "SignalBench",
  authors: [{ name: "Shola Ayeni", url: "https://github.com/ayenisholah" }],
  openGraph: { type: "website", siteName: "SignalBench", title: "SignalBench · Honest fills, real metrics", description: DESCRIPTION, url: SITE_URL },
  twitter: { card: "summary", title: "SignalBench", description: DESCRIPTION },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = { themeColor: "#0f0f0f", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const index = await loadIndex();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:font-mono focus:text-[12px] focus:uppercase focus:text-paper"
        >
          Skip to content
        </a>
        <Header dataAsOf={index.dataAsOf} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer commit={process.env.COMMIT_SHA} />
      </body>
    </html>
  );
}
