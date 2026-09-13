"use client";

import { FormEvent, useState } from "react";
import { useAuthPrompt } from "@/components/AuthPromptProvider";

export default function PromoCodeRedeemer() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { openLoginPrompt } = useAuthPrompt();

  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/promo-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (response.status === 401) {
        openLoginPrompt("Sign in with Google before redeeming a promo code.");
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "Unable to redeem promo code");
      const gems = Number(result.gems);
      setCode("");
      setMessage(`Success! ${gems.toLocaleString()} gems were added to your garden.`);
      window.dispatchEvent(new CustomEvent("anigarden:gems-updated", { detail: { amount: gems } }));
    } catch (redemptionError) {
      setError(redemptionError instanceof Error ? redemptionError.message : "Unable to redeem promo code");
    } finally {
      setLoading(false);
    }
  }

  return <section className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-950/15 p-5 text-left"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Bonus gems</p><h2 className="mt-2 text-xl font-bold text-white">Have a promo code?</h2><p className="mt-1 text-sm text-slate-400">Enter a code from AniGarden to add free gems to your balance.</p></div><span className="text-3xl" aria-hidden="true">🎁</span></div><form onSubmit={redeem} className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="promo-code">Promo code</label><input id="promo-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. WELCOME100" autoComplete="off" maxLength={32} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-semibold tracking-wider text-white outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-600 focus:border-violet-300" /><button type="submit" disabled={loading || !code.trim()} className="rounded-xl bg-violet-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Checking…" : "Redeem code"}</button></form>{message ? <p role="status" className="mt-3 text-sm font-semibold text-lime-200">{message}</p> : null}{error ? <p role="alert" className="mt-3 text-sm text-red-200">{error}</p> : null}<p className="mt-3 text-xs text-slate-500">Each promo code can be redeemed once per account.</p></section>;
}
