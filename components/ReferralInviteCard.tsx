"use client";

import { useEffect, useState } from "react";

export default function ReferralInviteCard() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/referrals/me")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load invite link");
        setInviteUrl(`${window.location.origin}/login?ref=${encodeURIComponent(result.code)}`);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load invite link"));
  }, []);

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  return <section className="mt-4 rounded-2xl border border-sky-300/25 bg-gradient-to-r from-sky-950/50 to-violet-950/40 px-3 py-3 shadow-lg shadow-sky-950/10 sm:px-4"><div className="flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/15 text-2xl" aria-hidden="true">🎁</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-sm font-bold text-white">Invite a friend</h2><span className="rounded-full bg-lime-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-garden-950">15 gems · FREE</span></div><p className="mt-1 text-xs text-slate-400">You both get 15 gems when they join.</p><p className="mt-0.5 text-[10px] text-slate-500/70">Referral reward works once per account.</p></div><button type="button" onClick={copyInvite} disabled={!inviteUrl} className="rounded-lg bg-sky-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50">{copied ? "✓ Copied" : "Copy invite link"}</button></div>{error ? <p role="alert" className="mt-2 text-xs text-red-200">{error}</p> : null}</section>;
}
