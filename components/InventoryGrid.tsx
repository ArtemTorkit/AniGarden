"use client";

import { useMemo, useState } from "react";
import RarityLabel from "@/components/RarityLabel";
import BloomStars from "@/components/BloomStars";

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

export default function InventoryGrid({ items, initialRarityFilter = "all", ownerCounts = {} }: { items: InventoryItem[]; initialRarityFilter?: string; ownerCounts?: Record<string, number> }) {
  const [nameFilter, setNameFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState(initialRarityFilter);

  const rarities = [...new Set(items.map((item) => item.rarity))].sort();
  const filteredItems = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    return items.filter((item) => {
      const matchesName = !query || item.name.toLowerCase().includes(query);
      const matchesRarity = rarityFilter === "all" || item.rarity === rarityFilter;
      return matchesName && matchesRarity;
    });
  }, [items, nameFilter, rarityFilter]);
  const groupedItems = filteredItems.reduce<Record<string, InventoryItem[]>>((groups, item) => {
    (groups[item.gacha_name] ??= []).push(item);
    return groups;
  }, {});

  return (
    <div className="mt-8">
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-[1fr_180px]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Search by name</span>
          <input
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder="Search your characters…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Rarity</span>
          <select
            value={rarityFilter}
            onChange={(event) => setRarityFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm capitalize text-white outline-none transition focus:border-lime-300"
          >
            <option value="all">All rarities</option>
            {rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
          </select>
        </label>
      </div>

      <p className="mt-5 text-sm text-slate-500">Showing {filteredItems.length} of {items.length} pulls</p>
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
                <article key={item.id} className={`overflow-hidden rounded-xl border bg-slate-900 shadow-lg ${rarityCardStyles[item.rarity] ?? rarityCardStyles.common}`}>
                  <div className={`h-1 ${rarityAccentStyles[item.rarity] ?? rarityAccentStyles.common}`} />
                  <div className="relative aspect-square bg-garden-900"><img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /><span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${rarityStyles[item.rarity] ?? rarityStyles.common}`}><RarityLabel rarity={item.rarity} className="text-inherit" /></span></div>
                  <div className="bg-slate-950/30 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-white">{item.name}</h3><p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.14em] text-slate-600">{new Date(item.acquired_at).toLocaleDateString()}</p></div><BloomStars bloomingRate={item.blooming_rate} /></div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400"><span title="Number of unique gardeners who own this character" className="cursor-help rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1">{ownerCounts[item.character_id] ?? 0} {ownerCounts[item.character_id] === 1 ? "owner" : "owners"}</span><span title="Edition number: this character’s place in the global collection" className="cursor-help rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1">{item.edition_number ? `Edition #${item.edition_number}` : "Legacy edition"}</span></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
