import AppHeader from "@/components/AppHeader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";
import BuyMeACoffeePurchase from "@/components/BuyMeACoffeePurchase";
import PromoCodeRedeemer from "@/components/PromoCodeRedeemer";

export const metadata = { title: "Gem Shop — AniGarden" };

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: transactions } = user ? await supabase
    .from("gem_transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "completed") : { data: [] };
  const gemBalance = (transactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyPullAvailable = user ? await hasDailyPullAvailable(supabase, user.id) : false;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader gemBalance={gemBalance} dailyPullAvailable={dailyPullAvailable} userName={user ? (typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : `user${user.id.replace(/-/g, "").slice(0, 6)}`) : "Guest"} avatarUrl={user ? (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null) : null} />
        <section className="mx-auto mt-10 max-w-4xl rounded-3xl border border-lime-300/20 bg-gradient-to-br from-garden-800/90 via-garden-900 to-slate-950 p-6 text-center shadow-2xl shadow-black/20 sm:p-10">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-300">Gem shop</p>
            <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Keep your garden growing.</h1>
            <p className="mt-4 text-base leading-7 text-slate-300">Green gems are AniGarden’s in-game currency. Use them to plant character pulls.</p>
          <BuyMeACoffeePurchase paymentUrl={process.env.BUYMEACOFFEE_PAGE_URL ?? null} />
          <PromoCodeRedeemer />
          <p className="mt-5 text-left text-xs leading-5 text-slate-500">Gems and characters are closed-loop digital items with no cash-out or real-world monetary value. See <a href="/payments" className="text-lime-300 hover:text-lime-200">payments and refunds</a>.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
