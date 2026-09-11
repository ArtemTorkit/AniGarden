"use client";

import { useMemo, useState } from "react";
import type { TradeCharacter } from "@/lib/trades/data";
import RarityLabel from "@/components/RarityLabel";
import { getCardValue } from "@/lib/gacha/value";

export default function TradeRequestedPicker({ characters, onChange }: { characters: TradeCharacter[]; onChange: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("all");
  const rarities = [...new Set(characters.map((character) => character.rarity))].sort();
  const filtered = useMemo(() => characters.filter((character) => (!query.trim() || character.name.toLowerCase().includes(query.trim().toLowerCase())) && (rarity === "all" || character.rarity === rarity)), [characters, query, rarity]);
  const totalCount = Object.values(selected).reduce((sum, count) => sum + count, 0);
  const totalValue = Object.entries(selected).reduce((sum, [id, count]) => { const character = characters.find((item) => item.id === id); return sum + (character ? getCardValue(character.rarity) * count : 0); }, 0);
  function update(id: string, nextCount: number) {
    const next = { ...selected };
    if (nextCount > 0) next[id] = nextCount; else delete next[id];
    setSelected(next);
    onChange(Object.entries(next).flatMap(([characterId, count]) => Array.from({ length: count }, () => characterId)));
  }
  return <div><div className="rounded-2xl border border-sky-300/20 bg-slate-950/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Requested characters</p><p className="mt-1 text-sm text-slate-400">{totalCount} selected · maximum 10</p></div><p className="text-sm font-bold text-amber-200">✦ {totalValue.toLocaleString()} garden value</p></div>{totalCount ? <div className="mt-3 flex flex-wrap gap-2">{Object.entries(selected).map(([id, count]) => { const character = characters.find((item) => item.id === id); return character ? <span key={id} className="flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-200">{character.name} × {count}<button type="button" onClick={() => update(id, 0)} aria-label={`Remove ${character.name}`} className="text-sky-100 hover:text-white">×</button></span> : null; })}</div> : null}</div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search characters…" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-300" /><select value={rarity} onChange={(event) => setRarity(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm capitalize text-white outline-none focus:border-sky-300"><option value="all">All rarities</option>{rarities.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{filtered.map((character) => { const count = selected[character.id] ?? 0; return <button key={character.id} type="button" onClick={() => update(character.id, count >= 10 || totalCount >= 10 ? count : count + 1)} className={`overflow-hidden rounded-xl border text-left transition hover:-translate-y-1 ${count ? "border-sky-300 ring-2 ring-sky-300/30" : "border-slate-800 bg-slate-900 hover:border-sky-300/50"}`}><div className="relative aspect-[4/3] bg-garden-900"><img src={character.image_url} alt={character.name} className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] font-bold uppercase text-slate-200"><RarityLabel rarity={character.rarity} /></span>{count ? <span className="absolute right-2 top-2 rounded-full bg-sky-300 px-2 py-1 text-xs font-bold text-slate-950">×{count}</span> : null}</div><div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-sm font-semibold text-white">{character.name}</span><span className="whitespace-nowrap text-xs font-bold text-amber-200">✦ {getCardValue(character.rarity).toLocaleString()}</span></div></button>; })}</div></div>;
}
