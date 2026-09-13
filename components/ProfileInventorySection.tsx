"use client";

import { useState } from "react";
import InventoryGrid, { type InventoryItem } from "@/components/InventoryGrid";
import RarityLabel from "@/components/RarityLabel";
import GardenPrestigeGuide from "@/components/GardenPrestigeGuide";

export default function ProfileInventorySection({ items, rarityCounts, ownerCounts, gardenValue }: { items: InventoryItem[]; rarityCounts: Record<string, number>; ownerCounts: Record<string, number>; gardenValue: number }) {
  const [selectedRarity, setSelectedRarity] = useState("all");

  return (
    <>
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">Your pulls</p><h1 className="mt-1 text-2xl font-bold text-white">Garden stats</h1></div></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelectedRarity("all")} className={`rounded-xl border px-4 py-2 text-left transition ${selectedRarity === "all" ? "border-lime-300/50 bg-garden-900" : "border-lime-300/20 bg-garden-900 hover:border-lime-300/50"}`}><span className="text-xs uppercase tracking-wider text-slate-500">Total</span> <span className="ml-2 font-bold text-white">{items.length}</span></button>
          <div className="rounded-xl border border-amber-300/30 bg-amber-950/20 px-4 py-2"><span className="text-xs uppercase tracking-wider text-amber-200/70">Garden value</span> <span className="ml-2 font-bold text-amber-200">✦ {gardenValue.toLocaleString()}</span></div>
          {Object.entries(rarityCounts).map(([rarity, count]) => <button type="button" key={rarity} onClick={() => setSelectedRarity(rarity)} className={`rounded-xl border px-4 py-2 text-left transition ${selectedRarity === rarity ? "border-lime-300/50 bg-garden-900" : "border-slate-800 bg-slate-900 hover:border-lime-300/40"}`}><RarityLabel rarity={rarity} className="text-xs font-semibold" /> <span className="ml-2 font-bold text-white">{count}</span></button>)}
        </div>
        <GardenPrestigeGuide />
      </section>
      <section className="mt-10"><h2 className="text-2xl font-bold text-white">Inventory</h2><InventoryGrid key={selectedRarity} items={items} initialRarityFilter={selectedRarity} ownerCounts={ownerCounts} canSell /></section>
    </>
  );
}
