import type { MetadataRoute } from "next";
import { DESCRIPTION, SITE_NAME, THEME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: honest-fill signal backtester`,
    short_name: SITE_NAME,
    description: DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME.paper,
    theme_color: THEME.paper,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
