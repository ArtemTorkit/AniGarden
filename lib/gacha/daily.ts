import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasDailyPullAvailable(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: dailyBanners } = await supabase
    .from("gacha_banners")
    .select("id")
    .eq("is_active", true)
    .eq("daily_free", true);

  const bannerIds = (dailyBanners ?? []).map((banner) => banner.id);
  if (!bannerIds.length) return false;

  const todayUtc = new Date().toISOString().slice(0, 10);
  const { data: claims } = await supabase
    .from("daily_gacha_claims")
    .select("id")
    .eq("user_id", userId)
    .eq("claimed_on", todayUtc)
    .in("banner_id", bannerIds)
    .limit(1);

  return !claims?.length;
}
