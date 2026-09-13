"use client";

import { useState } from "react";
import { useAuthPrompt } from "@/components/AuthPromptProvider";
import { calculateGemsFromUsdCents } from "@/lib/billing/buymeacoffee";
import { GEMS_PER_USD, FIFTEEN_DOLLAR_BONUS_GEMS, TEN_DOLLAR_BONUS_GEMS, isLaunchPromotionActive, LAUNCH_PROMOTION_ENDS_AT, MIN_PURCHASE_AMOUNT_CENTS } from "@/lib/gacha/economy";

export default function BuyMeACoffeePurchase({ paymentUrl }: { paymentUrl: string | null }) {
  const [amountUsd, setAmountUsd] = useState("5");
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { openLoginPrompt } = useAuthPrompt();

  const amountCents = Math.round(Number(amountUsd) * 100);
  const previewGems = Math.floor((amountCents * GEMS_PER_USD)/100) + (amountCents >= 1500 ? FIFTEEN_DOLLAR_BONUS_GEMS : amountCents >= 1000 ? TEN_DOLLAR_BONUS_GEMS : 0);
  const minimumPurchaseGems = Math.floor((MIN_PURCHASE_AMOUNT_CENTS * GEMS_PER_USD) / 100);
  const promotionActive = isLaunchPromotionActive();

  async function beginPurchase() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/billing/buymeacoffee/intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountUsd: Number(amountUsd) }) });
      const result = await response.json();
      if (response.status === 401) { openLoginPrompt("Sign in with Google before creating a gem purchase code."); return; }
      if (!response.ok) throw new Error(result.error ?? "Unable to start purchase");
      setClaimCode(result.claimCode);
      setCopied(false);
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : "Unable to start purchase");
    } finally {
      setLoading(false);
    }
  }

  async function copyClaimCode() {
    if (!claimCode) return;
    await navigator.clipboard.writeText(claimCode);
    setCopied(true);
  }

  return <div className="mt-8 text-left">
    {promotionActive ? <div className="relative overflow-hidden rounded-3xl border-2 border-amber-200/70 bg-[radial-gradient(circle_at_top_right,rgba(253,224,71,0.32),transparent_42%),linear-gradient(135deg,rgba(20,83,45,0.98),rgba(15,23,42,0.98))] p-5 shadow-2xl shadow-amber-300/20 motion-safe:[animation:promo-pulse_4s_ease-in-out_infinite] sm:p-7">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-200/20 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-100/50 bg-amber-100/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-100"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-200" /> Limited launch offer</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl">2× gems</h2>
          <p className="mt-3 max-w-xl text-base font-semibold leading-6 text-amber-50 sm:text-lg">Buy now and get double the gems on every purchase.</p>
          <p className="mt-2 text-sm text-amber-100/80">For example: <span className="font-black text-white">$4 → {minimumPurchaseGems.toLocaleString()} gems</span></p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-slate-950/40 px-4 py-3 text-center backdrop-blur-sm">
          <p className="text-3xl font-black text-amber-200">2×</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100/70">bonus active</p>
        </div>
      </div>
      <p className="relative mt-5 border-t border-white/15 pt-4 text-xs font-medium text-amber-100/75">Offer ends {new Date(LAUNCH_PROMOTION_ENDS_AT).toLocaleDateString()} · Minimum purchase $4</p>
      <label className="relative mt-5 block text-sm font-bold text-white" htmlFor="bmc-amount">How much would you like to support?</label>
      <div className="relative mt-2 flex max-w-sm items-center gap-3"><span className="text-lg font-bold text-amber-100">$</span><input id="bmc-amount" type="number" min={MIN_PURCHASE_AMOUNT_CENTS / 100} max="500" step="0.01" value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} className="w-full rounded-xl border border-amber-100/40 bg-slate-950/70 px-3 py-3 text-white outline-none ring-amber-200/30 placeholder:text-slate-500 focus:border-amber-100 focus:ring-4" /></div>
      <p className="relative mt-3 text-base font-black text-lime-200">You’ll receive {previewGems.toLocaleString()} gems</p>
      <p className="relative mt-1 text-xs text-amber-100/70">$10+ gives 25 bonus gems · $15+ gives 50 bonus gems · all totals doubled during launch</p>
      <button type="button" onClick={beginPurchase} disabled={loading || previewGems <= 0 || amountCents > 50_000} className="relative mt-5 w-full rounded-xl bg-amber-200 px-5 py-3.5 text-sm font-black text-garden-950 shadow-lg shadow-amber-200/20 transition hover:bg-white hover:shadow-amber-100/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{loading ? "Preparing…" : "Get my 2× gems →"}</button>
    </div> : <div className="rounded-2xl border border-lime-300/20 bg-slate-950/50 p-5"><h2 className="text-lg font-bold text-white">Buy gems with Buy Me a Coffee</h2><p className="mt-2 text-sm leading-6 text-slate-400">Support AniGarden with $4 to $500. Every $1 gives 15 gems, with bonus gems at $10 and $15.</p><label className="mt-5 block text-sm font-semibold text-white" htmlFor="bmc-amount">Donation amount (USD)</label><div className="mt-2 flex max-w-sm items-center gap-3"><span className="text-lg text-slate-400">$</span><input id="bmc-amount" type="number" min={MIN_PURCHASE_AMOUNT_CENTS / 100} max="500" step="0.01" value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-lime-300" /></div><p className="mt-2 text-sm text-lime-200">You will receive approximately {previewGems.toLocaleString()} gems.</p><button type="button" onClick={beginPurchase} disabled={loading || previewGems <= 0 || amountCents > 50_000} className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Preparing…" : "Create claim code"}</button></div>}
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">How it works</p><ol className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3"><li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-300 text-sm font-black text-garden-950">1</span><strong className="mt-3 block text-white">Choose an amount</strong><span className="mt-1 block text-xs leading-5 text-slate-400">Set your donation above and generate your one-time code.</span></li><li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-300 text-sm font-black text-garden-950">2</span><strong className="mt-3 block text-white">Copy your code</strong><span className="mt-1 block text-xs leading-5 text-slate-400">Keep the code ready before opening the payment page.</span></li><li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-300 text-sm font-black text-garden-950">3</span><strong className="mt-3 block text-white">Paste and pay</strong><span className="mt-1 block text-xs leading-5 text-slate-400">Paste it into the Buy Me a Coffee support note, then pay.</span></li></ol></div>
    {claimCode ? <div className="mt-5 rounded-2xl border-2 border-amber-200/60 bg-amber-300/10 p-5 shadow-lg shadow-amber-300/10"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">Step 1 complete · Your code is ready</p><p className="mt-2 text-sm text-amber-50">Copy this code, then open Buy Me a Coffee and paste it into the support note.</p><code className="mt-4 block overflow-x-auto rounded-xl border border-amber-100/30 bg-slate-950/70 px-4 py-3 text-center text-lg font-black tracking-wider text-white">{claimCode}</code><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={copyClaimCode} className="rounded-lg border border-amber-100/50 bg-amber-100/10 px-4 py-2.5 text-sm font-bold text-amber-50 transition hover:border-amber-100 hover:bg-amber-100/20">{copied ? "✓ Code copied" : "Copy claim code"}</button>{paymentUrl ? <a href={paymentUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-black text-garden-950 transition hover:bg-lime-200">Step 2: Open Buy Me a Coffee ↗</a> : null}</div><p className="mt-4 border-t border-amber-100/15 pt-3 text-xs leading-5 text-amber-100/75"><strong className="text-amber-50">Important:</strong> paste the code into the support note before paying. Gems are added automatically after the signed payment webhook is verified.</p></div> : null}
    {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
  </div>;
}
