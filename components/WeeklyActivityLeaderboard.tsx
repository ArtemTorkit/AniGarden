import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LeaderboardEntry = {
  userId: string;
  pulls: number;
  nickname: string;
  avatarUrl: string | null;
  gardenValue: number;
};

function startOfUtcWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  now.setUTCDate(now.getUTCDate() - daysSinceMonday);
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

export default async function WeeklyActivityLeaderboard() {
  let entries: LeaderboardEntry[] = [];

  try {
    const admin = createSupabaseAdminClient();
    const { data: pulls } = await admin
      .from("gacha_pulls")
      .select("user_id")
      .gte("created_at", startOfUtcWeek());

    const counts = new Map<string, number>();
    for (const pull of pulls ?? []) counts.set(pull.user_id, (counts.get(pull.user_id) ?? 0) + 1);

    const topUsers = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const { data: profiles } = await admin.from("user_profiles").select("user_id, garden_value").in("user_id", topUsers.map(([userId]) => userId));
    const gardenValues = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.garden_value]));
    const users = await Promise.all(topUsers.map(async ([userId, count]) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      const metadata = data.user?.user_metadata ?? {};
      return {
        userId,
        pulls: count,
        nickname: typeof metadata.nickname === "string" && metadata.nickname.trim()
          ? metadata.nickname
          : `user${userId.replace(/-/g, "").slice(0, 6)}`,
        avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
        gardenValue: gardenValues.get(userId) ?? 0,
      };
    }));
    entries = users.filter((entry): entry is LeaderboardEntry => Boolean(entry));
  } catch (error) {
    console.error("[leaderboard] unable to load weekly activity", error);
  }

  return (
    <section className="mt-8 rounded-3xl border border-lime-300/20 bg-garden-900/80 p-6 shadow-xl shadow-black/20 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">Garden activity</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Top gardeners this week</h2>
        </div>
        <span className="text-xs text-slate-500">Resets every Monday</span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">No pulls have been recorded this week yet. Be the first to grow the leaderboard.</p>
      ) : (
        <div className="mt-5 divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-950/40 px-4">
          {entries.map((entry, index) => (
            <div key={entry.userId} className="flex items-center gap-3 py-3">
              <span className={`w-7 text-center text-sm font-bold ${index === 0 ? "text-amber-300" : index === 1 ? "text-slate-300" : index === 2 ? "text-orange-300" : "text-slate-500"}`}>{index + 1}</span>
              {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-300/15 text-sm font-bold text-lime-200">{entry.nickname.slice(0, 1).toUpperCase()}</span>}
              <Link href={`/profile/${entry.userId}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-white hover:text-lime-200">{entry.nickname}</Link>
              <span className="text-right"><span className="block text-sm font-semibold text-lime-300">{entry.pulls} {entry.pulls === 1 ? "pull" : "pulls"}</span><span className="block text-[10px] text-amber-200/70">✦ {entry.gardenValue.toLocaleString()}</span></span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
