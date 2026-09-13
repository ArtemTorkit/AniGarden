import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/AppHeader";
import { getCardValue } from "@/lib/gacha/value";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import { getCharacterOwnerCounts } from "@/lib/gacha/supply";
import { getPendingTradeOffers } from "@/lib/trades/data";
import WeeklyActivityLeaderboard from "@/components/WeeklyActivityLeaderboard";
import { LoginPromptButton } from "@/components/AuthPromptProvider";
import DashboardCharacterShowcase, { type DashboardCharacter } from "@/components/DashboardCharacterShowcase";
import ReferralInviteCard from "@/components/ReferralInviteCard";
import RarityLabel from "@/components/RarityLabel";

export const metadata = { title: "Collection — AniGarden" };

async function getFeaturedCards(): Promise<DashboardCharacter[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: catalog }, { data: recentInventory }] = await Promise.all([
    admin.from("Characters").select("id, name, rarity, image_url").order("rarity_weight", { ascending: false }).limit(24),
    admin.from("User_Inventory").select("character_id, blooming_rate, edition_number, user_id, acquired_at").order("acquired_at", { ascending: false }).limit(48),
  ]);
  const characterMap = new Map((catalog ?? []).map((character) => [character.id, character]));
  const featured: DashboardCharacter[] = [];
  const usedCharacters = new Set<string>();
  for (const pull of recentInventory ?? []) {
    const character = characterMap.get(pull.character_id);
    if (!character || usedCharacters.has(character.id)) continue;
    usedCharacters.add(character.id);
    featured.push({ ...character, id: character.id, blooming_rate: pull.blooming_rate ?? 1, gardenValue: getCardValue(character.rarity, pull.blooming_rate ?? 1), ownerId: pull.user_id, ownerName: null, ownerAvatarUrl: null });
    if (featured.length === 18) break;
  }
  for (const character of catalog ?? []) {
    if (usedCharacters.has(character.id)) continue;
    featured.push({ ...character, id: character.id, blooming_rate: 1, gardenValue: getCardValue(character.rarity), ownerId: null, ownerName: null, ownerAvatarUrl: null });
    if (featured.length === 18) break;
  }
  const ownerIds = [...new Set(featured.flatMap((card) => card.ownerId ? [card.ownerId] : []))];
  const owners = await Promise.all(ownerIds.map(async (ownerId) => [ownerId, (await admin.auth.admin.getUserById(ownerId)).data.user] as const));
  const ownerMap = new Map(owners.filter(([, owner]) => owner).map(([ownerId, owner]) => [ownerId, owner!]));
  for (const card of featured) {
    const owner = card.ownerId ? ownerMap.get(card.ownerId) : null;
    card.ownerName = typeof owner?.user_metadata?.nickname === "string" && owner.user_metadata.nickname.trim() ? owner.user_metadata.nickname : owner ? `user${owner.id.replace(/-/g, "").slice(0, 6)}` : null;
    card.ownerAvatarUrl = typeof owner?.user_metadata?.avatar_url === "string" ? owner.user_metadata.avatar_url : null;
  }
  return featured.sort((a, b) => b.gardenValue - a.gardenValue);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: gemTransactions }, featuredCards, offers] = await Promise.all([
    user ? supabase.from("gem_transactions").select("amount").eq("user_id", user.id).eq("status", "completed") : Promise.resolve({ data: [] }),
    getFeaturedCards(),
    getPendingTradeOffers().catch(() => []),
  ]);
  const gemBalance = (gemTransactions ?? []).reduce((balance, transaction) => balance + transaction.amount, 0);
  const dailyPullAvailable = user ? await hasDailyPullAvailable(supabase, user.id) : false;
  const userName = user ? (typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : `user${user.id.replace(/-/g, "").slice(0, 6)}`) : "Guest";
  const ownerCounts = await getCharacterOwnerCounts(featuredCards.map((card) => card.id));

  return <main className="min-h-screen bg-slate-950 px-6 py-8 sm:px-10"><div className="mx-auto max-w-5xl"><AppHeader gemBalance={gemBalance} dailyPullAvailable={dailyPullAvailable} userName={userName} avatarUrl={user ? (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null) : null} />
    <section className="dashboard-hero mt-10 grid gap-10 overflow-hidden rounded-3xl border border-lime-300/20 bg-gradient-to-br from-garden-800 via-garden-900 to-slate-950 p-8 shadow-xl shadow-black/20 sm:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"><div><p className="text-sm font-medium text-lime-200">Welcome to AniGarden</p><h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">A living garden for extraordinary characters.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Plant a pull, reveal a character, and grow a collection worth showing off.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/gacha" className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300">Plant a pull →</Link>{user ? <Link href="/profile" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-lime-300 hover:text-lime-200">View my collection</Link> : <LoginPromptButton className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-lime-300 hover:text-lime-200">Sign in to view your collection</LoginPromptButton>}</div></div><div className="dashboard-hero-preview relative mx-auto w-full max-w-sm" aria-label="How AniGarden works"><span className="dashboard-pollen dashboard-pollen-1" aria-hidden="true" /><span className="dashboard-pollen dashboard-pollen-2" aria-hidden="true" /><span className="dashboard-pollen dashboard-pollen-3" aria-hidden="true" /><span className="dashboard-pollen dashboard-pollen-4" aria-hidden="true" /><div className="relative z-10 mb-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"><span className="dashboard-step-label dashboard-step-label-1 text-lime-300">Plant</span><span className="dashboard-step-label dashboard-step-label-2 text-fuchsia-300">Reveal</span><span className="dashboard-step-label dashboard-step-label-3 text-emerald-300">Collect</span></div><div className="relative z-10 flex items-end justify-center gap-2 sm:gap-3">{featuredCards.slice(0, 3).map((card, index) => <div key={card.id} className={`dashboard-hero-card dashboard-hero-card-${index + 1} w-1/3`}><div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 p-1.5 shadow-2xl"><img src={card.image_url} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" /><div className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-950/75 px-1.5 py-1 text-center backdrop-blur-sm"><RarityLabel rarity={card.rarity} className="text-[8px] font-black uppercase tracking-wider" /></div></div><p className="mt-2 truncate text-center text-[10px] font-semibold text-slate-400">{index === 0 ? "Choose a garden" : index === 1 ? "Meet your resident" : "Build your collection"}</p></div>)}</div></div></section>
    <section className="mt-10"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2"><div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-2xl font-bold text-white sm:text-3xl">Characters in the garden</h2><p className="text-sm text-slate-400">Recently collected by AniGarden gardeners.</p></div><Link href="/gacha" className="text-sm font-semibold text-lime-300 hover:text-lime-200">Explore all gardens →</Link></div><DashboardCharacterShowcase cards={featuredCards} ownerCounts={ownerCounts} /></section>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Explore AniGarden">
      <Link href="/gacha" className="dashboard-action-card dashboard-action-card-lime" style={{ "--action-delay": "0ms" } as React.CSSProperties}><span className="dashboard-action-icon">🌱</span><h2 className="mt-4 text-lg font-bold text-white">Plant a pull</h2><p className="mt-2 text-sm leading-6 text-slate-400">Discover who is waiting beneath the soil.</p><span className="mt-4 inline-block text-xs font-bold text-lime-300">Start growing →</span></Link>
      <Link href="/profile" className="dashboard-action-card dashboard-action-card-green" style={{ "--action-delay": "80ms" } as React.CSSProperties}><span className="dashboard-action-icon">🌿</span><h2 className="mt-4 text-lg font-bold text-white">My collection</h2><p className="mt-2 text-sm leading-6 text-slate-400">Browse every resident in your garden.</p><span className="mt-4 inline-block text-xs font-bold text-emerald-300">Open inventory →</span></Link>
      <Link href="/trades" className="dashboard-action-card dashboard-action-card-sky" style={{ "--action-delay": "160ms" } as React.CSSProperties}><span className="dashboard-action-icon">🔄</span><h2 className="mt-4 text-lg font-bold text-white">Character trades</h2><p className="mt-2 text-sm leading-6 text-slate-400">Swap residents with fellow gardeners.</p><span className="mt-4 inline-block text-xs font-bold text-sky-300">Browse swaps →</span></Link>
      <Link href="/billing" className="dashboard-action-card dashboard-action-card-gold" style={{ "--action-delay": "240ms" } as React.CSSProperties}><span className="dashboard-action-icon">💎</span><div className="mt-4 flex items-center gap-2"><h2 className="text-lg font-bold text-white">Gem shop</h2><span className="rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-950">2× now</span></div><p className="mt-2 text-sm leading-6 text-slate-400">Get twice the gems during the launch promotion.</p><span className="mt-4 inline-block text-xs font-bold text-amber-200">Claim the bonus →</span></Link>
    </section>
    {user ? <ReferralInviteCard /> : null}
    <section className="mt-14"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Community marketplace-free swaps</p><h2 className="mt-2 text-3xl font-bold text-white">Open trade offers</h2><p className="mt-2 text-sm text-slate-400">See what gardeners are offering and requesting right now.</p></div><Link href="/trades" className="text-sm font-semibold text-lime-300 hover:text-lime-200">Browse all trades →</Link></div>{offers.length ? <div className="mt-6 grid gap-5 md:grid-cols-2">{offers.slice(0, 4).map((offer) => <Link key={offer.id} href={`/trades/${offer.share_token}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-lime-300/50"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-white">Character swap offer</p><span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-300">Open</span></div><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Offered</p><div className="flex -space-x-2">{offer.creatorItems.slice(0, 3).map((card) => <img key={card.id} src={card.image_url} alt={card.name} title={card.name} className="h-12 w-12 rounded-xl border-2 border-slate-900 object-cover" />)}</div></div><span className="text-lg text-lime-300">⇄</span><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Requested</p><div className="flex -space-x-2">{offer.requestedCharacters.slice(0, 3).map((character) => <img key={character.id} src={character.image_url} alt={character.name} title={character.name} className="h-12 w-12 rounded-xl border-2 border-slate-900 object-cover" />)}</div></div></div><div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm font-bold text-amber-200">✦ {offer.creatorValue.toLocaleString()} garden value</span><span className="text-sm font-semibold text-lime-300">View trade →</span></div></Link>)}</div> : <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">No open offers yet. Be the first gardener to create one.</p>}</section>
    <WeeklyActivityLeaderboard />
  </div></main>;
}
