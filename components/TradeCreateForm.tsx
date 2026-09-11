"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TradeCardPicker from "@/components/TradeCardPicker";
import TradeRequestedPicker from "@/components/TradeRequestedPicker";
import type { TradeCard, TradeCharacter } from "@/lib/trades/data";
import { getInventoryValue } from "@/lib/gacha/value";

export default function TradeCreateForm({ cards, characters }: { cards: TradeCard[]; characters: TradeCharacter[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [offeredIds, setOfferedIds] = useState<string[]>([]);
  const [requestedCharacterIds, setRequestedCharacterIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offeredValue = getInventoryValue(cards.filter((card) => offeredIds.includes(card.id)));

  async function createOffer() {
    if (!offeredIds.length || !requestedCharacterIds.length) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/trades/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inventoryIds: offeredIds, requestedCharacterIds }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create trade offer");
      router.push(`/trades/${data.token}`);
    } catch (createError) { setError(createError instanceof Error ? createError.message : "Unable to create trade offer"); setBusy(false); }
  }

  return <div>
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3 text-sm font-semibold"><span className={`rounded-full px-3 py-1 ${step === 1 ? "bg-lime-300 text-garden-950" : "bg-lime-300/10 text-lime-300"}`}>1. You offer</span><span className="h-px w-8 bg-slate-700" /><span className={`rounded-full px-3 py-1 ${step === 2 ? "bg-lime-300 text-garden-950" : "bg-slate-800 text-slate-500"}`}>2. You want</span></div>{step === 1 ? <button type="button" disabled={!offeredIds.length} onClick={() => setStep(2)} className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">Next: choose wanted characters →</button> : null}</div>
    <div className={step === 1 ? "" : "hidden"}><TradeCardPicker cards={cards} mode="create" showSubmit={false} onSelectionChange={setOfferedIds} /><div className="mt-6 flex justify-end"><button type="button" disabled={!offeredIds.length} onClick={() => setStep(2)} className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">Next: choose wanted characters →</button></div></div>
    <div className={step === 2 ? "" : "hidden"}><div className="mb-6 rounded-2xl border border-lime-300/20 bg-slate-950/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-white">You are offering {offeredIds.length} character{offeredIds.length === 1 ? "" : "s"}.</p><p className="text-sm font-bold text-amber-200">✦ {offeredValue.toLocaleString()} garden value</p></div><button type="button" onClick={() => setStep(1)} className="mt-2 text-sm font-semibold text-lime-300 hover:text-lime-200">← Edit offered characters</button></div><TradeRequestedPicker characters={characters} onChange={setRequestedCharacterIds} /><div className="mt-6 flex flex-wrap items-center justify-between gap-4"><button type="button" onClick={() => setStep(1)} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-lime-300">← Back</button><button type="button" disabled={!requestedCharacterIds.length || busy} onClick={createOffer} className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Creating offer…" : "Create trade offer"}</button></div>{error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}</div>
  </div>;
}
