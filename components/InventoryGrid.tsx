"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import RarityLabel from "@/components/RarityLabel";
import BloomStars from "@/components/BloomStars";
import { getSellValue } from "@/lib/gacha/economy";
import { sortInventoryItems, type InventorySort } from "@/lib/gacha/inventory";
import { getCardValue } from "@/lib/gacha/value";

export type InventoryItem = {
  id: string;
  character_id: string;
  name: string;
  rarity: string;
  image_url: string;
  acquired_at: string;
  gacha_name: string;
  edition_number?: number | null;
  blooming_rate: number;
};

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

const modalGlowColors: Record<string, string> = {
  common: "rgba(203, 213, 225, 0.45)",
  uncommon: "rgba(163, 230, 53, 0.55)",
  rare: "rgba(56, 189, 248, 0.6)",
  epic: "rgba(232, 121, 249, 0.65)",
  legendary: "rgba(252, 211, 77, 0.75)",
};

export default function InventoryGrid({ items, initialRarityFilter = "all", ownerCounts = {}, canSell = false }: { items: InventoryItem[]; initialRarityFilter?: string; ownerCounts?: Record<string, number>; canSell?: boolean }) {
  const router = useRouter();
  const [nameFilter, setNameFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState(initialRarityFilter);
  const [sort, setSort] = useState<InventorySort>("value-desc");
  const [page, setPage] = useState(1);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (!selectedItem) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedItem(null); };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = previousOverflow; };
  }, [selectedItem]);

  const rarities = [...new Set(items.map((item) => item.rarity))].sort();
  const sortedItems = useMemo(() => sortInventoryItems(items, sort), [items, sort]);
  const filteredItems = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    return sortedItems.filter((item) => {
      const matchesName = !query || item.name.toLowerCase().includes(query);
      const matchesRarity = rarityFilter === "all" || item.rarity === rarityFilter;
      return matchesName && matchesRarity;
    });
  }, [sortedItems, nameFilter, rarityFilter]);
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const groupedItems = visibleItems.reduce<Record<string, InventoryItem[]>>((groups, item) => {
    (groups[item.gacha_name] ??= []).push(item);
    return groups;
  }, {});

  async function sellCharacter(item: InventoryItem) {
    const sellValue = getSellValue(item.rarity);
    if (!sellValue || !window.confirm(`Sell ${item.name} for ${sellValue} gem${sellValue === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setSellingId(item.id);
    setError(null);
    try {
      const response = await fetch("/api/inventory/sell", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inventoryId: item.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sell character");
      window.dispatchEvent(new CustomEvent("anigarden:gems-updated", { detail: { amount: Number(result.gems) } }));
      router.refresh();
    } catch (sellError) {
      setError(sellError instanceof Error ? sellError.message : "Unable to sell character");
    } finally {
      setSellingId(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-[1fr_180px_180px]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Search by name</span>
          <input
            value={nameFilter}
            onChange={(event) => { setNameFilter(event.target.value); setPage(1); }}
            placeholder="Search your characters…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Rarity</span>
          <select
            value={rarityFilter}
            onChange={(event) => { setRarityFilter(event.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm capitalize text-white outline-none transition focus:border-lime-300"
          >
            <option value="all">All rarities</option>
            {rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Sort by</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value as InventorySort); setPage(1); }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-lime-300">
            <option value="value-desc">Garden value ↓</option>
            <option value="rarity-asc">Rarity ↑</option>
            <option value="rarity-desc">Rarity ↓</option>
          </select>
        </label>
      </div>

      <p className="mt-5 text-sm text-slate-500">Showing {filteredItems.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} pulls</p>
      {filteredItems.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">No characters match those filters.</p>
      ) : (
        Object.entries(groupedItems).map(([gachaName, group]) => (
          <section key={gachaName} className="mt-8 first:mt-5">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">{gachaName}</h2>
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-xs text-slate-500">{group.length} pulls</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${item.name}`}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedItem(item); } }}
                  className={`group/card cursor-zoom-in overflow-hidden rounded-xl border bg-slate-900 shadow-lg outline-none transition-[box-shadow,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-lime-300 motion-reduce:transition-none ${rarityCardStyles[item.rarity] ?? rarityCardStyles.common}`}
                  onMouseMove={(event) => {
                    const card = event.currentTarget;
                    const bounds = card.getBoundingClientRect();
                    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                    const image = card.querySelector<HTMLElement>("[data-card-art]");
                    card.style.transform = `perspective(900px) rotateX(${y * -2}deg) rotateY(${x * 2}deg) translateY(-2px)`;
                    card.style.boxShadow = `${x * 10}px ${18 - y * 8}px 34px rgba(163, 230, 53, 0.22)`;
                    if (image) image.style.transform = `translate(${x * 8}px, ${y * 8}px) scale(1.045)`;
                  }}
                  onMouseLeave={(event) => {
                    const card = event.currentTarget;
                    const image = card.querySelector<HTMLElement>("[data-card-art]");
                    card.style.transform = "";
                    card.style.boxShadow = "";
                    if (image) image.style.transform = "";
                  }}
                >
                  <div className={`h-1 ${rarityAccentStyles[item.rarity] ?? rarityAccentStyles.common}`} />
                  <div className="relative aspect-square overflow-hidden bg-garden-900"><img data-card-art src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 ease-out motion-reduce:transition-none" /><span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${rarityStyles[item.rarity] ?? rarityStyles.common}`}><RarityLabel rarity={item.rarity} className="text-inherit" /></span></div>
                  <div className="bg-slate-950/30 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-white">{item.name}</h3><p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.14em] text-slate-600">{new Date(item.acquired_at).toLocaleDateString()}</p></div><BloomStars bloomingRate={item.blooming_rate} /></div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400"><span className="rounded-full border border-amber-300/20 bg-amber-950/20 px-2 py-1 text-amber-200">✦ {getCardValue(item.rarity, item.blooming_rate).toLocaleString()} value</span><span title="Number of unique gardeners who own this character" className="cursor-help rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1">{ownerCounts[item.character_id] ?? 0} {ownerCounts[item.character_id] === 1 ? "owner" : "owners"}</span><span title="Edition number: this character’s place in the global collection" className="cursor-help rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1">{item.edition_number ? `Edition #${item.edition_number}` : "Legacy edition"}</span></div>
                    {canSell ? <button type="button" onClick={(event) => { event.stopPropagation(); void sellCharacter(item); }} disabled={sellingId !== null} className="mt-4 w-full cursor-pointer rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 transition hover:border-amber-200 hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50">{sellingId === item.id ? "Selling…" : `Sell for ${getSellValue(item.rarity)} gems`}</button> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
      {pageCount > 1 ? <div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-lime-300 disabled:cursor-not-allowed disabled:opacity-40">← Previous</button><span className="text-sm text-slate-500">Page {currentPage} of {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-lime-300 disabled:cursor-not-allowed disabled:opacity-40">Next →</button></div> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      {selectedItem ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="character-preview-title" onMouseDown={() => setSelectedItem(null)}><div className="relative max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-white/15 bg-slate-900 p-4 shadow-2xl [animation:modal-glow_3s_ease-in-out_infinite]" style={{ "--modal-glow": modalGlowColors[selectedItem.rarity] ?? modalGlowColors.common } as CSSProperties} onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelectedItem(null)} aria-label="Close character preview" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-xl text-slate-200 transition hover:border-lime-300 hover:text-white">×</button><div className="overflow-hidden rounded-2xl bg-garden-950"><img src={selectedItem.image_url} alt={selectedItem.name} className="mx-auto max-h-[72vh] w-full object-contain" /></div><div className="px-1 pb-1 pt-5 sm:px-2"><div className="flex flex-wrap items-center gap-3"><h2 id="character-preview-title" className="text-2xl font-bold text-white">{selectedItem.name}</h2><RarityLabel rarity={selectedItem.rarity} className="text-sm font-bold uppercase tracking-wider" /></div><div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-300"><span className="rounded-full border border-amber-300/20 bg-amber-950/20 px-3 py-1 text-amber-200">✦ {getCardValue(selectedItem.rarity, selectedItem.blooming_rate).toLocaleString()} garden value</span><span className="rounded-full border border-slate-700 px-3 py-1">Blooming rate {selectedItem.blooming_rate}/5</span>{selectedItem.edition_number ? <span className="rounded-full border border-slate-700 px-3 py-1">Edition #{selectedItem.edition_number}</span> : null}</div></div></div></div> : null}
    </div>
  );
}
