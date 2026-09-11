import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import PlantPullExperience from "@/components/PlantPullExperience";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import RarityLabel from "@/components/RarityLabel";
import { getCharacterOwnerCounts } from "@/lib/gacha/supply";

type Character = { id: string; name: string; rarity: string; image_url: string };

const rarityCardStyles: Record<string, string> = {
  common: "border-slate-700 shadow-slate-950/30",
  uncommon: "border-lime-500/50 shadow-lime-950/30",
  rare: "border-sky-400/50 shadow-sky-950/30",
  epic: "border-fuchsia-400/50 shadow-fuchsia-950/30",
  legendary: "border-amber-300/70 shadow-amber-950/40",
};

const rarityBadgeStyles: Record<string, string> = {
  common: "border-slate-600 bg-slate-800/90 text-slate-300",
  uncommon: "border-lime-500/40 bg-lime-950/80 text-lime-300",
  rare: "border-sky-400/40 bg-sky-950/80 text-sky-300",
  epic: "border-fuchsia-400/40 bg-fuchsia-950/80 text-fuchsia-300",
  legendary: "border-amber-300/50 bg-amber-950/80 text-amber-200",
};

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
    ? await supabase.from("Characters").select("id, name, rarity, image_url").in("id", ids)
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
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {sortedCharacters.map((character) => (
              <article key={character.id} className={`overflow-hidden rounded-2xl border bg-slate-900 shadow-lg ${rarityCardStyles[character.rarity] ?? rarityCardStyles.common}`}>
                <div className="relative aspect-square bg-garden-900"><img src={character.image_url} alt={character.name} className="h-full w-full object-cover" /><span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${rarityBadgeStyles[character.rarity] ?? rarityBadgeStyles.common}`}><RarityLabel rarity={character.rarity} className="text-inherit" /></span></div>
                <div className="p-4"><h2 className="font-semibold text-white">{character.name}</h2><p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Available in this pool</p><p className="mt-2 text-xs text-slate-400">Owned by {ownerCounts[character.id] ?? 0} {ownerCounts[character.id] === 1 ? "gardener" : "gardeners"}</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
