import type { MetadataRoute } from "next";
import { loadIndex } from "@/lib/runs";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await loadIndex();
  const lastModified = new Date(index.dataAsOf * 1000);
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/methodology`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    ...index.runs.map((r) => ({ url: `${SITE_URL}/runs/${r.id}`, lastModified, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
