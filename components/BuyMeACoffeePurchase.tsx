"use client";

import { useState } from "react";
import { useAuthPrompt } from "@/components/AuthPromptProvider";
import { calculateGemsFromUsdCents } from "@/lib/billing/buymeacoffee";

export default function BuyMeACoffeePurchase({ paymentUrl }: { paymentUrl: string | null }) {
  const [amountUsd, setAmountUsd] = useState("5");
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { openLoginPrompt } = useAuthPrompt();

  const amountCents = Math.round(Number(amountUsd) * 100);
  const previewGems = calculateGemsFromUsdCents(amountCents);

  async function beginPurchase() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/billing/buymeacoffee/intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountUsd: Number(amountUsd) }) });
      const result = await response.json();
      if (response.status === 401) { openLoginPrompt("Sign in with Google before creating a gem purchase code."); return; }
      if (!response.ok) throw new Error(result.error ?? "Unable to start purchase");
      setClaimCode(result.claimCode);
      setCopied(false);
      if (result.paymentUrl) window.open(result.paymentUrl, "_blank", "noopener,noreferrer");
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

  return <div className="mt-8 rounded-2xl border border-lime-300/20 bg-slate-950/50 p-5 text-left">
    <h2 className="text-lg font-bold text-white">Buy gems with Buy Me a Coffee</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">Support AniGarden with any amount from $1 to $500. Every $1 gives 3 gems, with bonus gems at $10 and $15.</p>
    <ol className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2"><li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="font-bold text-lime-300">1.</span> Choose your donation amount.</li><li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="font-bold text-lime-300">2.</span> Create and copy your claim code.</li><li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="font-bold text-lime-300">3.</span> Paste it into the Buy Me a Coffee support note.</li><li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="font-bold text-lime-300">4.</span> Your gems arrive after payment verification.</li></ol>
    <label className="mt-5 block text-sm font-semibold text-white" htmlFor="bmc-amount">Donation amount (USD)</label>
    <div className="mt-2 flex max-w-sm items-center gap-3"><span className="text-lg text-slate-400">$</span><input id="bmc-amount" type="number" min="1" max="500" step="0.01" value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-lime-300" /></div>
    <p className="mt-2 text-sm text-lime-200">You will receive approximately {previewGems.toLocaleString()} gems.</p>
    <p className="mt-1 text-xs text-slate-500">$10+ gives 5 bonus gems · $15+ gives 10 bonus gems</p>
    <button type="button" onClick={beginPurchase} disabled={loading || previewGems <= 0 || amountCents > 50_000} className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Preparing…" : "Create claim code"}</button>
    {claimCode ? <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4"><p className="text-sm font-semibold text-amber-100">Your claim code:</p><code className="mt-2 block text-lg font-bold tracking-wider text-white">{claimCode}</code><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={copyClaimCode} className="rounded-lg border border-amber-200/30 px-3 py-2 text-sm font-semibold text-amber-100 hover:border-amber-200">{copied ? "Copied" : "Copy code"}</button>{paymentUrl ? <a href={paymentUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-lime-300 px-3 py-2 text-sm font-bold text-garden-950 hover:bg-lime-200">Open Buy Me a Coffee ↗</a> : null}</div><p className="mt-3 text-xs leading-5 text-amber-100/70">Paste this code into the support note before paying. Your gems are added after the signed webhook arrives.</p></div> : null}
    {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
  </div>;
}
