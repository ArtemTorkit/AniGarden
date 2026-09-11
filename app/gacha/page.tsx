import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import { hasDailyPullAvailable } from "@/lib/gacha/daily";

export const metadata = { title: "Gachas — AniGarden" };

type Banner = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_image_url: string;
  cost_gems: number;
  daily_free: boolean;
};

export default async function GachaHubPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: gemTransactions } = user ? await supabase
    .from("gem_transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "completed") : { data: [] };
  const gemBalance = (gemTransactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyPullAvailable = user ? await hasDailyPullAvailable(supabase, user.id) : false;

  const { data: banners, error } = await supabase
    .from("gacha_banners")
    .select("id, slug, name, description, cover_image_url, cost_gems, daily_free")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <AppHeader gemBalance={gemBalance} dailyPullAvailable={dailyPullAvailable} userName={user ? (typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : `user${user.id.replace(/-/g, "").slice(0, 6)}`) : "Guest"} avatarUrl={user ? (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null) : null} />
        <h1 className="mt-8 text-3xl font-bold text-white">Choose a garden</h1>
        <p className="mt-2 text-sm text-slate-400">Each garden has its own character pool and drop rates.</p>

        {error ? (
          <p className="mt-8 rounded-xl border border-red-400/20 bg-red-950/30 p-4 text-sm text-red-200">We couldn’t load the available gardens.</p>
        ) : !banners?.length ? (
          <p className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">No gardens are blooming yet.</p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {(banners as Banner[]).map((banner) => (
              <Link key={banner.id} href={`/gacha/${banner.slug}`} className="group overflow-hidden rounded-3xl border border-lime-300/20 bg-garden-900 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-lime-300/60">
                <div className="aspect-[16/10] overflow-hidden bg-garden-800">
                  <img src={banner.cover_image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-bold text-white">{banner.name}</h2>
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${banner.daily_free && !dailyPullAvailable ? "bg-slate-800 text-slate-400" : "bg-lime-300/10 text-lime-300"}`}>{banner.daily_free ? dailyPullAvailable ? "Free pull available" : "Claimed today" : `💎 ${banner.cost_gems} / pull`}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{banner.description}</p>
                  <p className={`mt-5 text-sm font-semibold ${banner.daily_free && !dailyPullAvailable ? "text-slate-400" : "text-lime-300"}`}>{banner.daily_free && !dailyPullAvailable ? "Available again tomorrow" : "Enter this garden →"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
