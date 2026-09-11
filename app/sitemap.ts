import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/payments", priority: 0.5, changeFrequency: "monthly" as const },
  ].map(({ path, priority, changeFrequency }) => ({ url: `${baseUrl}${path}`, lastModified: "2026-09-06", priority, changeFrequency }));
}
