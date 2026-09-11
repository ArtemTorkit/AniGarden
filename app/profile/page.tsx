import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { type InventoryItem } from "@/components/InventoryGrid";
import ProfileInventorySection from "@/components/ProfileInventorySection";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileSettings from "@/components/ProfileSettings";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import { getCharacterOwnerCounts } from "@/lib/gacha/supply";
import { LoginPromptButton } from "@/components/AuthPromptProvider";

export const metadata = { title: "My Profile — AniGarden" };

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="min-h-screen bg-slate-950 px-6 py-8 sm:px-10"><div className="mx-auto max-w-5xl"><AppHeader userName="Guest" /><section className="mt-12 rounded-3xl border border-lime-300/20 bg-garden-900/70 p-10 text-center"><h1 className="text-3xl font-bold text-white">Your garden is waiting.</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">Sign in with Google to view your inventory, garden value, and profile settings.</p><LoginPromptButton className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300">Sign in with Google</LoginPromptButton></section></div></main>;

  const [{ data: pulls }, { data: gemTransactions }] = await Promise.all([
    supabase
      .from("User_Inventory")
      .select("id, character_id, edition_number, blooming_rate, acquired_at")
      .eq("user_id", user.id)
      .order("acquired_at", { ascending: false }),
    supabase
      .from("gem_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "completed"),
  ]);

  const characterIds = (pulls ?? []).map((item) => item.character_id);
  const { data: characters } = characterIds.length
    ? await supabase.from("Characters").select("id, name, rarity, image_url").in("id", characterIds)
    : { data: [] };
  const characterMap = new Map((characters ?? []).map((character) => [character.id, character]));
  const items: InventoryItem[] = (pulls ?? []).flatMap((item) => {
    const character = characterMap.get(item.character_id);
    return character ? [{ ...character, id: item.id, character_id: item.character_id, edition_number: item.edition_number, blooming_rate: item.blooming_rate, acquired_at: item.acquired_at, gacha_name: "Garden collection" }] : [];
  });
  const { data: storedProfile } = await supabase.from("user_profiles").select("garden_value").eq("user_id", user.id).maybeSingle();
  const ownerCounts = await getCharacterOwnerCounts([...new Set(items.map((item) => item.character_id))]);
  const gemBalance = (gemTransactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyPullAvailable = await hasDailyPullAvailable(supabase, user.id);
  const rarityCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.rarity] = (counts[item.rarity] ?? 0) + 1;
    return counts;
  }, {});
  const nickname = user.user_metadata?.nickname ?? `user${user.id.replace(/-/g, "").slice(0, 6)}`;
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const hideInventory = user.user_metadata?.hide_inventory === true;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader gemBalance={gemBalance} dailyPullAvailable={dailyPullAvailable} userName={nickname} avatarUrl={avatarUrl} />
        <section className="mt-8"><ProfileSettings nickname={nickname} avatarUrl={avatarUrl} hideInventory={hideInventory} /></section>
        {dailyPullAvailable ? <Link href="/gacha/daily-sprout" className="mt-6 flex items-center justify-between rounded-2xl border border-red-300/20 bg-red-950/20 px-4 py-3 text-sm transition hover:border-red-300/50"><span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400" /><span className="font-semibold text-red-100">Your daily pull is ready</span><span className="ml-2 text-red-200/70">Claim it before the day ends.</span></span><span className="font-semibold text-red-200">Go to gacha →</span></Link> : null}
        <ProfileInventorySection items={items} rarityCounts={rarityCounts} ownerCounts={ownerCounts} gardenValue={storedProfile?.garden_value ?? 0} />
      </div>
    </main>
  );
}
