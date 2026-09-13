import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import PlantPullExperience from "@/components/PlantPullExperience";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import { getCharacterOwnerCounts } from "@/lib/gacha/supply";
import { getCardValue } from "@/lib/gacha/value";
import GachaCharacterCatalog, { type GachaCatalogCharacter } from "@/components/GachaCharacterCatalog";

type Character = { id: string; name: string; rarity: string; subculture?: string | null; image_url: string };

const rarityOrder: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export default async function GachaBannerPage({ params }: { params: { slug: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: banner } = await supabase
    .from("gacha_banners")
    .select("id, name, description, cost_gems, daily_free")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!banner) notFound();

  const { data: pool } = await supabase.from("gacha_banner_characters").select("character_id").eq("banner_id", banner.id);
  const ids = (pool ?? []).map((entry) => entry.character_id);
  const { data: characters } = ids.length
    ? await supabase.from("Characters").select("id, name, rarity, subculture, image_url").in("id", ids)
    : { data: [] as Character[] };
  const sortedCharacters = [...(characters ?? [])].sort((a, b) => {
    const rarityDifference = (rarityOrder[a.rarity.toLowerCase()] ?? 999) - (rarityOrder[b.rarity.toLowerCase()] ?? 999);
    return rarityDifference || a.name.localeCompare(b.name);
  });

  const { data: gemTransactions } = user ? await supabase
    .from("gem_transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "completed") : { data: [] };
  const gemBalance = (gemTransactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyPullAvailable = user ? await hasDailyPullAvailable(supabase, user.id) : false;
  const ownerCounts = await getCharacterOwnerCounts(ids);
  const catalogCharacters: GachaCatalogCharacter[] = sortedCharacters.map((character) => ({ ...character, gardenValue: getCardValue(character.rarity), ownerCount: ownerCounts[character.id] ?? 0 }));

  return (
    <main className="min-h-screen bg-garden-950 px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader gemBalance={gemBalance} dailyPullAvailable={dailyPullAvailable} userName={user ? (typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : `user${user.id.replace(/-/g, "").slice(0, 6)}`) : "Guest"} avatarUrl={user ? (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null) : null} />
        <Link href="/gacha" className="mt-6 inline-block text-sm text-lime-300 hover:text-lime-200">← All gardens</Link>
        <section className="mt-5 rounded-2xl border border-lime-300/20 bg-garden-900/80 p-6 shadow-xl shadow-black/20 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-300">AniGarden gacha</p>
              <h1 className="mt-2 text-3xl font-bold text-white">{banner.name}</h1>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${banner.daily_free && !dailyPullAvailable ? "border-slate-600 bg-slate-800 text-slate-300" : "border-lime-300/30 bg-lime-300/10 text-lime-200"}`}>{banner.daily_free ? dailyPullAvailable ? "Free pull available" : "Claimed today" : `💎 ${banner.cost_gems} / pull`}</span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">{banner.description}</p>
        </section>

        <section className="mt-5 rounded-3xl border border-lime-300/20 bg-slate-900/60 p-4 shadow-2xl shadow-black/20 sm:p-8">
          <PlantPullExperience bannerSlug={params.slug} costGems={banner.cost_gems} dailyFree={banner.daily_free} dailyPullAvailable={dailyPullAvailable} />
        </section>

        <section className="mt-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">This garden contains</p>
          <GachaCharacterCatalog characters={catalogCharacters} />
        </section>
      </div>
    </main>
  );
}
