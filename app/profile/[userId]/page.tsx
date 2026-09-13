import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import InventoryGrid, { type InventoryItem } from "@/components/InventoryGrid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import { getCharacterOwnerCounts } from "@/lib/gacha/supply";
import GardenPrestigeGuide from "@/components/GardenPrestigeGuide";

export async function generateMetadata({ params }: { params: { userId: string } }) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(params.userId);
  const nickname = typeof data.user?.user_metadata?.nickname === "string" ? data.user.user_metadata.nickname : "Gardener";
  return { title: `${nickname} — AniGarden` };
}

export default async function PublicProfilePage({ params }: { params: { userId: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const admin = createSupabaseAdminClient();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(params.userId);
  if (userError || !userData.user) notFound();
  const profileUser = userData.user;
  const metadata = profileUser.user_metadata ?? {};
  const nickname = typeof metadata.nickname === "string" && metadata.nickname.trim() ? metadata.nickname : `user${profileUser.id.replace(/-/g, "").slice(0, 6)}`;
  const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
  const viewerName = viewer ? (typeof viewer.user_metadata?.nickname === "string" ? viewer.user_metadata.nickname : `user${viewer.id.replace(/-/g, "").slice(0, 6)}`) : "Guest";
  const viewerAvatarUrl = viewer ? (typeof viewer.user_metadata?.avatar_url === "string" ? viewer.user_metadata.avatar_url : null) : null;
  const isOwner = viewer?.id === profileUser.id;
  const hideInventory = metadata.hide_inventory === true;

  const [{ data: gemTransactions }, { data: pulls }, { data: storedProfile }] = await Promise.all([
    viewer ? supabase.from("gem_transactions").select("amount").eq("user_id", viewer.id).eq("status", "completed") : Promise.resolve({ data: [] }),
    hideInventory && !isOwner ? Promise.resolve({ data: [] }) : admin.from("User_Inventory").select("id, character_id, edition_number, blooming_rate, acquired_at").eq("user_id", profileUser.id).order("acquired_at", { ascending: false }),
    admin.from("user_profiles").select("garden_value").eq("user_id", profileUser.id).maybeSingle(),
  ]);
  const gemBalance = (gemTransactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyPullAvailable = viewer ? await hasDailyPullAvailable(supabase, viewer.id) : false;
  const visiblePulls = pulls ?? [];
  const characterIds = visiblePulls.map((pull) => pull.character_id);
  const { data: characters } = characterIds.length
    ? await admin.from("Characters").select("id, name, rarity, image_url").in("id", characterIds)
    : { data: [] };
  const characterMap = new Map((characters ?? []).map((character) => [character.id, character]));
  const items: InventoryItem[] = visiblePulls.flatMap((pull) => {
    const character = characterMap.get(pull.character_id);
    return character ? [{ ...character, id: pull.id, character_id: pull.character_id, edition_number: pull.edition_number, blooming_rate: pull.blooming_rate, acquired_at: pull.acquired_at, gacha_name: "Garden collection" }] : [];
  });
  const ownerCounts = await getCharacterOwnerCounts([...new Set(items.map((item) => item.character_id))]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader gemBalance={gemBalance} dailyPullAvailable={dailyPullAvailable} userName={viewerName} avatarUrl={viewerAvatarUrl} />
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-lime-300 hover:text-lime-200">← Back to dashboard</Link>
        <section className="mt-6 flex items-center gap-4 rounded-3xl border border-lime-300/20 bg-garden-900/80 p-6 shadow-xl shadow-black/20">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-lime-300/40 bg-garden-800">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-bold text-lime-300">✦</span>}</div>
          <div><p className="text-2xl font-bold text-white">{nickname}</p><p className="mt-1 text-sm text-slate-500">AniGarden profile</p></div>
        </section>
        {hideInventory && !isOwner ? <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center"><p className="text-lg font-semibold text-white">This inventory is private</p><p className="mt-2 text-sm text-slate-400">{nickname} has chosen to keep their collection hidden.</p></section> : <section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-white">{isOwner ? "Your inventory" : `${nickname}'s inventory`}</h1><span className="rounded-xl border border-amber-300/30 bg-amber-950/20 px-4 py-2 text-sm font-bold text-amber-200">✦ {(storedProfile?.garden_value ?? 0).toLocaleString()} garden value</span></div><GardenPrestigeGuide /><InventoryGrid items={items} ownerCounts={ownerCounts} canSell={isOwner} /></section>}
      </div>
    </main>
  );
}
