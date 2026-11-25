import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * Pages are prerendered, so there are no per-request nonces: Next's inline bootstrap scripts and the JSON-LD block need
 * 'unsafe-inline'. Everything else, including fonts, is same-origin. There are no third-party scripts or runtime fetches.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const config: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so workspace packages land in the standalone bundle.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  // The run JSON is read at build time by pages and at runtime by /api/health.
  outputFileTracingIncludes: { "/api/health": ["./data/index.json"] },
  transpilePackages: ["@signalbench/engine"],
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default config;
