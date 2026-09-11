"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoginPromptButton } from "@/components/AuthPromptProvider";

export default function AppHeader({ gemBalance = 0, dailyPullAvailable = false, userName = "Guest", avatarUrl = null }: { gemBalance?: number; dailyPullAvailable?: boolean; userName?: string; avatarUrl?: string | null }) {
  const [displayBalance, setDisplayBalance] = useState(gemBalance);

  useEffect(() => {
    const handleGemUpdate = (event: Event) => {
      const amount = (event as CustomEvent<{ amount?: number }>).detail?.amount ?? 0;
      setDisplayBalance((balance) => Math.max(0, balance + amount));
    };
    window.addEventListener("anigarden:gems-updated", handleGemUpdate);
    return () => window.removeEventListener("anigarden:gems-updated", handleGemUpdate);
  }, []);

  return (
    <header className="grid grid-cols-1 items-center gap-4 border-b border-slate-800 pb-6 sm:grid-cols-[1fr_auto_1fr]">
      <Link href="/dashboard" className="group flex min-w-0 items-center gap-3 justify-self-start">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lime-300/40 bg-slate-950 shadow-lg shadow-black/30 transition group-hover:rotate-3">
          <span className="absolute h-4 w-2.5 -translate-x-1 -rotate-[35deg] rounded-full bg-lime-300" />
          <span className="absolute h-4 w-2.5 translate-x-1 rotate-[35deg] rounded-full bg-lime-500" />
          <span className="absolute bottom-2 h-3 w-0.5 rotate-45 bg-lime-200" />
        </span>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.25em] text-lime-300">AniGarden</span>
          <span className="hidden text-sm text-slate-500 sm:block">Grow your collection</span>
        </span>
      </Link>

      <nav className="col-start-1 row-start-2 flex min-w-0 items-center gap-5 overflow-x-auto pb-1 text-sm sm:col-start-2 sm:row-start-1 sm:justify-center sm:overflow-visible sm:pb-0">
        <Link href="/dashboard" className="text-slate-300 transition hover:text-lime-300">My garden</Link>
        <Link href="/gacha" className="relative text-slate-300 transition hover:text-lime-300">
          Gachas
          {dailyPullAvailable ? <span aria-label="Daily pull available" className="absolute -right-3 -top-1 h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.15)]" /> : null}
        </Link>
        <Link href="/trades" className="text-slate-300 transition hover:text-lime-300">Trades</Link>
      </nav>

      <div className="col-start-1 row-start-3 flex min-w-0 items-center gap-2 sm:col-start-3 sm:row-start-1 sm:justify-self-end sm:gap-3">
        {userName === "Guest" ? <LoginPromptButton className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-garden-950 transition hover:bg-lime-300">Sign in with Google</LoginPromptButton> : null}
        {userName !== "Guest" ? <><Link href="/billing" title="Buy more green gems" className="group relative flex items-center gap-2 rounded-2xl border border-lime-300/30 bg-gradient-to-br from-lime-300/15 to-garden-900 px-3 py-2 text-sm font-bold text-lime-200 transition hover:border-lime-300 hover:from-lime-300/25">
          <span aria-hidden="true">💎</span> {displayBalance.toLocaleString()}
          <span className="pointer-events-none absolute right-0 top-full z-10 mt-3 w-48 rounded-xl border border-lime-300/20 bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-5 text-slate-300 opacity-0 shadow-xl shadow-black/30 transition group-hover:opacity-100 group-focus-visible:opacity-100">Green gems are used to plant character pulls. Click to buy more.</span>
        </Link><span className="h-8 w-px bg-slate-800" /><Link href="/profile" className="group flex min-w-0 max-w-[120px] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 py-1 pl-1 pr-3 transition hover:border-lime-300 sm:max-w-[150px]">
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-garden-800">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-sm font-bold text-lime-300">{userName.slice(0, 1).toUpperCase()}</span>}</span><span className="truncate text-sm font-semibold text-slate-200 group-hover:text-lime-200">{userName}</span>
        </Link></> : null}
      </div>
    </header>
  );
}
