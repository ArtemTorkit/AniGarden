import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/AppHeader";
import BloomStars from "@/components/BloomStars";
import RarityLabel from "@/components/RarityLabel";
import { getCardValue } from "@/lib/gacha/value";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import { getCharacterOwnerCounts } from "@/lib/gacha/supply";
import { getPendingTradeOffers } from "@/lib/trades/data";
import WeeklyActivityLeaderboard from "@/components/WeeklyActivityLeaderboard";
import { LoginPromptButton } from "@/components/AuthPromptProvider";

export const metadata = { title: "Collection — AniGarden" };

type FeaturedCard = { id: string; name: string; rarity: string; image_url: string; blooming_rate: number; gardenValue: number };

async function getFeaturedCards(): Promise<FeaturedCard[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: catalog }, { data: recentInventory }] = await Promise.all([
    admin.from("Characters").select("id, name, rarity, image_url").order("rarity_weight", { ascending: false }).limit(12),
    admin.from("User_Inventory").select("character_id, blooming_rate, edition_number").order("acquired_at", { ascending: false }).limit(12),
  ]);
  const characterMap = new Map((catalog ?? []).map((character) => [character.id, character]));
  const featured: FeaturedCard[] = [];
  const usedCharacters = new Set<string>();
  for (const pull of recentInventory ?? []) {
    const character = characterMap.get(pull.character_id);
    if (!character || usedCharacters.has(character.id)) continue;
    usedCharacters.add(character.id);
    featured.push({ ...character, id: character.id, blooming_rate: pull.blooming_rate ?? 1, gardenValue: getCardValue(character.rarity, pull.blooming_rate ?? 1) });
    if (featured.length === 6) break;
  }
  for (const character of catalog ?? []) {
    if (usedCharacters.has(character.id)) continue;
    featured.push({ ...character, id: character.id, blooming_rate: 1, gardenValue: getCardValue(character.rarity) });
    if (featured.length === 6) break;
  }
  return featured;
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
    <section className="mt-10 rounded-3xl border border-lime-300/20 bg-gradient-to-br from-garden-800 via-garden-900 to-slate-950 p-8 shadow-xl shadow-black/20 sm:p-12"><p className="text-sm font-medium text-lime-200">Welcome to AniGarden</p><h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">A living garden for extraordinary characters.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Spend green gems to plant mystery pulls, discover new residents, and grow a collection worth showing off.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/gacha" className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300">Explore gachas →</Link>{user ? <Link href="/profile" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-lime-300 hover:text-lime-200">View my collection</Link> : <LoginPromptButton className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-lime-300 hover:text-lime-200">Sign in to view your collection</LoginPromptButton>}</div></section>
    <section className="mt-8 grid gap-5 md:grid-cols-3"><Link href="/gacha" className="rounded-2xl border border-lime-300/20 bg-garden-900 p-6 transition hover:-translate-y-1 hover:border-lime-300/60"><span className="text-3xl">🌱</span><h2 className="mt-5 text-lg font-bold text-white">Plant a pull</h2><p className="mt-2 text-sm leading-6 text-slate-400">Choose a themed garden and discover who is waiting beneath the soil.</p></Link><Link href="/profile" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-lime-300/40"><span className="text-3xl">🌿</span><h2 className="mt-5 text-lg font-bold text-white">My collection</h2><p className="mt-2 text-sm leading-6 text-slate-400">Browse every resident you have pulled and filter your growing garden.</p></Link><Link href="/billing" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-lime-300/40"><span className="text-3xl">💎</span><h2 className="mt-5 text-lg font-bold text-white">Gem shop</h2><p className="mt-2 text-sm leading-6 text-slate-400">Grow your gem balance through the available purchase options.</p></Link></section>
    <section className="mt-14"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">What gardeners are collecting</p><h2 className="mt-2 text-3xl font-bold text-white">Featured characters</h2></div><Link href="/gacha" className="text-sm font-semibold text-lime-300 hover:text-lime-200">Explore all gardens →</Link></div>{featuredCards.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featuredCards.map((card) => <article key={card.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg"><img src={card.image_url} alt={card.name} className="aspect-[4/3] w-full object-cover" /><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{card.name}</h3><p className="mt-1 text-xs"><RarityLabel rarity={card.rarity} /></p></div><BloomStars bloomingRate={card.blooming_rate} /></div><div className="mt-4 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-amber-200">✦ {card.gardenValue.toLocaleString()} value</span><span className="text-slate-400">Owned by {ownerCounts[card.id] ?? 0} {ownerCounts[card.id] === 1 ? "gardener" : "gardeners"}</span></div></div></article>)}</div> : <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">The first characters are still growing.</p>}</section>
    <section className="mt-14"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Community marketplace-free swaps</p><h2 className="mt-2 text-3xl font-bold text-white">Open trade offers</h2><p className="mt-2 text-sm text-slate-400">See what gardeners are offering and requesting right now.</p></div><Link href="/trades" className="text-sm font-semibold text-lime-300 hover:text-lime-200">Browse all trades →</Link></div>{offers.length ? <div className="mt-6 grid gap-5 md:grid-cols-2">{offers.slice(0, 4).map((offer) => <Link key={offer.id} href={`/trades/${offer.share_token}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-lime-300/50"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-white">Character swap offer</p><span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-300">Open</span></div><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Offered</p><div className="flex -space-x-2">{offer.creatorItems.slice(0, 3).map((card) => <img key={card.id} src={card.image_url} alt={card.name} title={card.name} className="h-12 w-12 rounded-xl border-2 border-slate-900 object-cover" />)}</div></div><span className="text-lg text-lime-300">⇄</span><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Requested</p><div className="flex -space-x-2">{offer.requestedCharacters.slice(0, 3).map((character) => <img key={character.id} src={character.image_url} alt={character.name} title={character.name} className="h-12 w-12 rounded-xl border-2 border-slate-900 object-cover" />)}</div></div></div><div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm font-bold text-amber-200">✦ {offer.creatorValue.toLocaleString()} garden value</span><span className="text-sm font-semibold text-lime-300">View trade →</span></div></Link>)}</div> : <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">No open offers yet. Be the first gardener to create one.</p>}</section>
    <WeeklyActivityLeaderboard />
  </div></main>;
}
