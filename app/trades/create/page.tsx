import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import TradeCreateForm from "@/components/TradeCreateForm";
import { getTradeCards, getTradeCharacterCatalog } from "@/lib/trades/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import { LoginPromptButton } from "@/components/AuthPromptProvider";

export const metadata = { title: "Create Trade — AniGarden" };

export default async function CreateTradePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: transactions }, cards, characters] = await Promise.all([
    user ? supabase.from("gem_transactions").select("amount").eq("user_id", user.id).eq("status", "completed") : Promise.resolve({ data: [] }),
    user ? getTradeCards(user.id) : Promise.resolve([]),
    getTradeCharacterCatalog(),
  ]);
  const gemBalance = (transactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyPullAvailable = user ? await hasDailyPullAvailable(supabase, user.id) : false;
  const userName = user ? (typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : `user${user.id.replace(/-/g, "").slice(0, 6)}`) : "Guest";
  return <main className="min-h-screen bg-slate-950 px-6 py-8 sm:px-10"><div className="mx-auto max-w-5xl">
    <AppHeader gemBalance={gemBalance} dailyPullAvailable={dailyPullAvailable} userName={userName} avatarUrl={user ? (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null) : null} />
    <div className="mt-10"><Link href="/trades" className="text-sm text-lime-300 hover:text-lime-200">← Back to open trades</Link><p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-lime-300">New trade offer</p><h1 className="mt-3 text-4xl font-bold text-white">Choose what you want to trade.</h1><p className="mt-4 max-w-2xl leading-7 text-slate-400">Select up to 10 characters from your collection. We’ll create a unique shareable offer page for you.</p></div>
    <section className="mt-8 rounded-3xl border border-lime-300/20 bg-garden-900/60 p-6 sm:p-8">{user ? <TradeCreateForm cards={cards} characters={characters} /> : <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center"><h2 className="text-xl font-bold text-white">Your collection is needed to create an offer</h2><p className="mt-2 text-sm leading-6 text-slate-400">Sign in with Google to choose specific cards from your inventory and publish a unique trade link.</p><LoginPromptButton className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300">Sign in to create an offer</LoginPromptButton></div>}</section>
  </div></main>;
}
