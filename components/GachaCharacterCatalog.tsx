"use client";

import { useEffect, useState, type CSSProperties } from "react";
import RarityLabel from "@/components/RarityLabel";

export type GachaCatalogCharacter = {
  id: string;
  name: string;
  rarity: string;
  subculture?: string | null;
  image_url: string;
  gardenValue: number;
  ownerCount: number;
};

const rarityStyles: Record<string, { card: string; badge: string; glow: string }> = {
  common: { card: "border-slate-700 shadow-slate-950/30", badge: "border-slate-600 bg-slate-800/90 text-slate-300", glow: "rgba(203, 213, 225, 0.45)" },
  uncommon: { card: "border-lime-500/50 shadow-lime-950/30", badge: "border-lime-500/40 bg-lime-950/80 text-lime-300", glow: "rgba(163, 230, 53, 0.55)" },
  rare: { card: "border-sky-400/50 shadow-sky-950/30", badge: "border-sky-400/40 bg-sky-950/80 text-sky-300", glow: "rgba(56, 189, 248, 0.6)" },
  epic: { card: "border-fuchsia-400/50 shadow-fuchsia-950/30", badge: "border-fuchsia-400/40 bg-fuchsia-950/80 text-fuchsia-300", glow: "rgba(232, 121, 249, 0.65)" },
  legendary: { card: "border-amber-300/70 shadow-amber-950/40", badge: "border-amber-300/50 bg-amber-950/80 text-amber-200", glow: "rgba(252, 211, 77, 0.75)" },
};

export default function GachaCharacterCatalog({ characters }: { characters: GachaCatalogCharacter[] }) {
  const [selectedCharacter, setSelectedCharacter] = useState<GachaCatalogCharacter | null>(null);

  useEffect(() => {
    if (!selectedCharacter) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedCharacter(null); };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = previousOverflow; };
  }, [selectedCharacter]);

  return <>
    <div className="grid gap-5 sm:grid-cols-3">
      {characters.map((character) => {
        const styles = rarityStyles[character.rarity.toLowerCase()] ?? rarityStyles.common;
        return <article key={character.id} role="button" tabIndex={0} aria-label={`Preview ${character.name}`} onClick={() => setSelectedCharacter(character)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCharacter(character); } }} className={`group cursor-zoom-in overflow-hidden rounded-2xl border bg-slate-900 shadow-lg outline-none transition duration-200 hover:-translate-y-1 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-lime-300 ${styles.card}`}>
          <div className="relative aspect-square bg-garden-900"><img src={character.image_url} alt={character.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${styles.badge}`}><RarityLabel rarity={character.rarity} className="text-inherit" /></span></div>
          <div className="p-4"><h2 className="font-semibold text-white">{character.name}</h2><p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Available in this pool</p><div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400"><span>Owned by {character.ownerCount} {character.ownerCount === 1 ? "gardener" : "gardeners"}</span><span className="font-bold text-amber-200">✦ {character.gardenValue.toLocaleString()}</span></div></div>
        </article>;
      })}
    </div>
    {selectedCharacter ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="gacha-character-title" onMouseDown={() => setSelectedCharacter(null)}><div className="relative max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-white/15 bg-slate-900 p-4 shadow-2xl [animation:modal-glow_3s_ease-in-out_infinite]" style={{ "--modal-glow": (rarityStyles[selectedCharacter.rarity.toLowerCase()] ?? rarityStyles.common).glow } as CSSProperties} onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelectedCharacter(null)} aria-label="Close character preview" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-xl text-slate-200 transition hover:border-lime-300 hover:text-white">×</button><div className="overflow-hidden rounded-2xl bg-garden-950"><img src={selectedCharacter.image_url} alt={selectedCharacter.name} className="mx-auto max-h-[72vh] w-full object-contain" /></div><div className="px-1 pb-1 pt-5 sm:px-2"><div className="flex flex-wrap items-center gap-3"><h2 id="gacha-character-title" className="text-2xl font-bold text-white">{selectedCharacter.name}</h2><RarityLabel rarity={selectedCharacter.rarity} className="text-sm font-bold uppercase tracking-wider" /></div><div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-300"><span className="rounded-full border border-amber-300/20 bg-amber-950/20 px-3 py-1 text-amber-200">✦ {selectedCharacter.gardenValue.toLocaleString()} garden value</span>{selectedCharacter.subculture ? <span className="rounded-full border border-sky-300/20 bg-sky-950/20 px-3 py-1 text-sky-200">{selectedCharacter.subculture}</span> : null}<span className="rounded-full border border-slate-700 px-3 py-1">{selectedCharacter.ownerCount} {selectedCharacter.ownerCount === 1 ? "owner" : "owners"}</span></div><p className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-400">This character can appear when you plant a pull in this garden.</p></div></div></div> : null}
  </>;
}
