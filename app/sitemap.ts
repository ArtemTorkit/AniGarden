import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { data: banners } = await supabase
    .from("gacha_banners")
    .select("slug")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const staticPages = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/gacha", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/payments", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  const bannerPages: MetadataRoute.Sitemap = (banners ?? []).map(
    ({ slug }) => ({
      url: `${baseUrl}/gacha/${slug}`,
      priority: 0.8,
      changeFrequency: "weekly" as const,
    }),
  );

  const staticSitemap = staticPages.map(({ path, ...page }) => ({
    url: `${baseUrl}${path ?? ""}`,
    lastModified: "2026-09-11",
    ...page,
  }));

  return [...staticSitemap, ...bannerPages];
}
