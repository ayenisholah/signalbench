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
import { AUTHOR, DESCRIPTION, KEYWORDS, REPO_URL, SITE_NAME, SITE_URL, TAGLINE, THEME } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · ${TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [AUTHOR],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: "finance",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title: `${SITE_NAME} · ${TAGLINE}`, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} · ${TAGLINE}`, description: DESCRIPTION },
};

/** schema.org description of the app and its source, for search engines. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
  isBasedOn: {
    "@type": "SoftwareSourceCode",
    name: SITE_NAME,
    codeRepository: REPO_URL,
    programmingLanguage: "TypeScript",
    license: "https://opensource.org/licenses/MIT",
  },
};

export const viewport: Viewport = { themeColor: THEME.paper, colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const index = await loadIndex();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
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
