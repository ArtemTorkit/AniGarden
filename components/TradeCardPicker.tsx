"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TradeCard } from "@/lib/trades/data";
import RarityLabel from "@/components/RarityLabel";
import BloomStars from "@/components/BloomStars";
import { getInventoryValue } from "@/lib/gacha/value";

const rarityStyles: Record<string, string> = {
  common: "border-slate-600 bg-slate-800/80 text-slate-300",
  uncommon: "border-lime-500/40 bg-lime-950/40 text-lime-300",
  rare: "border-sky-400/40 bg-sky-950/40 text-sky-300",
  epic: "border-fuchsia-400/40 bg-fuchsia-950/40 text-fuchsia-300",
  legendary: "border-amber-300/50 bg-amber-950/40 text-amber-200",
};

const rarityCardStyles: Record<string, string> = {
  common: "border-slate-700 shadow-slate-950/30",
  uncommon: "border-lime-500/50 shadow-lime-950/30",
  rare: "border-sky-400/50 shadow-sky-950/30",
  epic: "border-fuchsia-400/50 shadow-fuchsia-950/30",
  legendary: "border-amber-300/70 shadow-amber-950/40",
};

const rarityAccentStyles: Record<string, string> = {
  common: "bg-slate-500",
  uncommon: "bg-lime-400",
  rare: "bg-sky-400",
  epic: "bg-fuchsia-400",
  legendary: "bg-amber-300",
};

export default function TradeCardPicker({ cards, mode, token, requestedCharacterIds = [], onSelectionChange, showSubmit = true }: { cards: TradeCard[]; mode: "create" | "accept"; token?: string; requestedCharacterIds?: string[]; onSelectionChange?: (ids: string[]) => void; showSubmit?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function toggle(id: string) {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : current.length >= 10 ? current : [...current, id];
      onSelectionChange?.(next);
      return next;
    });
  }
  const rarities = [...new Set(cards.map((card) => card.rarity))].sort();
  const filteredCards = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    return cards.filter((card) => (!query || card.name.toLowerCase().includes(query)) && (rarityFilter === "all" || card.rarity === rarityFilter));
  }, [cards, nameFilter, rarityFilter]);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleCards = filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedCards = selected.flatMap((id) => { const card = cards.find((item) => item.id === id); return card ? [card] : []; });
  const selectedValue = getInventoryValue(selectedCards);
  async function submit() {
    if (!selected.length || (mode === "accept" && !token)) return;
    setBusy(true); setError(null);
    try {
      const endpoint = mode === "create" ? "/api/trades/create" : `/api/trades/${token}/accept`;
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inventoryIds: selected, requestedCharacterIds }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Trade request failed");
      router.push(mode === "create" ? `/trades/${data.token}` : "/trades");
      router.refresh();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Trade request failed"); setBusy(false); }
  }
  return <div>
    <div className="rounded-2xl border border-lime-300/20 bg-slate-950/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Selected characters</p><p className="mt-1 text-sm text-slate-400">{selected.length} selected · maximum 10</p><p className="mt-2 text-sm font-bold text-amber-200">✦ {selectedValue.toLocaleString()} garden value</p>{mode === "create" && !requestedCharacterIds.length && showSubmit ? <p className="mt-2 text-xs text-amber-300">Select at least one wanted character below.</p> : null}</div>{showSubmit ? <button type="button" disabled={!selected.length || busy || (mode === "create" && !requestedCharacterIds.length)} onClick={submit} className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Processing…" : mode === "create" ? "Create trade offer" : "Accept trade"}</button> : null}</div>
      {selected.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{selected.map((id) => { const card = cards.find((item) => item.id === id); return card ? <button key={card.id} type="button" onClick={() => toggle(card.id)} title={`Remove ${card.name}`} className={`group overflow-hidden rounded-xl border bg-slate-900 text-left shadow-lg transition hover:-translate-y-1 ${rarityCardStyles[card.rarity] ?? rarityCardStyles.common}`}><div className={`h-1 ${rarityAccentStyles[card.rarity] ?? rarityAccentStyles.common}`} /><div className="relative aspect-[4/3] bg-garden-900"><img src={card.image_url} alt={card.name} className="h-full w-full object-cover" /><span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${rarityStyles[card.rarity] ?? rarityStyles.common}`}><RarityLabel rarity={card.rarity} className="text-inherit" /></span><span className="absolute right-3 top-3 rounded-full bg-red-400/90 px-2 py-1 text-[10px] font-bold text-slate-950">Remove</span></div><div className="bg-slate-950/30 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-white">{card.name}</h3><p className="mt-1 whitespace-nowrap text-xs text-slate-400">Collected {new Date(card.acquired_at).toLocaleDateString()}</p></div><BloomStars bloomingRate={card.blooming_rate} /></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400"><span className="whitespace-nowrap rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1">{card.edition_number ? `Edition #${card.edition_number}` : "Legacy edition"}</span></div></div></button> : null; })}</div> : <p className="mt-4 rounded-xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">Choose cards below to build your offer.</p>}
    </div>
    <div className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-[1fr_180px]"><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Search by name</span><input value={nameFilter} onChange={(event) => { setNameFilter(event.target.value); setPage(1); }} placeholder="Search your characters…" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300" /></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Rarity</span><select value={rarityFilter} onChange={(event) => { setRarityFilter(event.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm capitalize text-white outline-none transition focus:border-lime-300"><option value="all">All rarities</option>{rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}</select></label></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Showing {filteredCards.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredCards.length)} of {filteredCards.length} pulls</p>{pageCount > 1 ? <div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-40">← Previous</button><span className="text-xs text-slate-500">Page {currentPage} of {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-40">Next →</button></div> : null}</div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleCards.map((card) => <button key={card.id} type="button" onClick={() => toggle(card.id)} className={`overflow-hidden rounded-xl border bg-slate-900 text-left shadow-lg transition hover:-translate-y-1 ${selected.includes(card.id) ? "ring-2 ring-lime-300/60" : ""} ${rarityCardStyles[card.rarity] ?? rarityCardStyles.common}`}>
      <div className={`h-1 ${rarityAccentStyles[card.rarity] ?? rarityAccentStyles.common}`} /><div className="relative aspect-[4/3] bg-garden-900"><img src={card.image_url} alt={card.name} className="h-full w-full object-cover" /><span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${rarityStyles[card.rarity] ?? rarityStyles.common}`}><RarityLabel rarity={card.rarity} className="text-inherit" /></span>{selected.includes(card.id) ? <span className="absolute right-3 top-3 rounded-full bg-lime-300 px-2 py-1 text-[10px] font-bold text-garden-950">Selected</span> : null}</div><div className="bg-slate-950/30 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-white">{card.name}</h3><p className="mt-1 whitespace-nowrap text-xs text-slate-400">Collected {new Date(card.acquired_at).toLocaleDateString()}</p></div><BloomStars bloomingRate={card.blooming_rate} /></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400"><span className="whitespace-nowrap rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1">{card.edition_number ? `Edition #${card.edition_number}` : "Legacy edition"}</span></div></div>
    </button>)}</div>
    {!filteredCards.length ? <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">No characters match those filters.</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
  </div>;
}
