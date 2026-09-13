"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import RarityLabel from "@/components/RarityLabel";

export type DashboardCharacter = {
  id: string;
  name: string;
  rarity: string;
  image_url: string;
  blooming_rate: number;
  gardenValue: number;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
};

const glowColors: Record<string, string> = {
  common: "rgba(203, 213, 225, 0.45)",
  uncommon: "rgba(163, 230, 53, 0.55)",
  rare: "rgba(56, 189, 248, 0.6)",
  epic: "rgba(232, 121, 249, 0.65)",
  legendary: "rgba(252, 211, 77, 0.75)",
};

function OwnerAvatar({ card, large = false }: { card: DashboardCharacter; large?: boolean }) {
  const size = large ? "h-10 w-10" : "h-5 w-5";
  return <span className={`${size} shrink-0 overflow-hidden rounded-full border border-sky-300/30 bg-garden-800`}>{card.ownerAvatarUrl ? <img src={card.ownerAvatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-sky-200">{(card.ownerName ?? "G").slice(0, 1).toUpperCase()}</span>}</span>;
}

export default function DashboardCharacterShowcase({ cards, ownerCounts }: { cards: DashboardCharacter[]; ownerCounts: Record<string, number> }) {
  const [selectedCard, setSelectedCard] = useState<DashboardCharacter | null>(null);
  const [page, setPage] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  const pages = Array.from({ length: pageCount }, (_, index) => cards.slice(index * pageSize, (index + 1) * pageSize));
  const renderedPages = pageCount > 1 ? [...pages, ...pages] : pages;
  const carouselRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const slideWidth = Math.max(0, viewportWidth - 64);

  useEffect(() => {
    if (!selectedCard) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedCard(null); };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = previousOverflow; };
  }, [selectedCard]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const updateWidth = () => setViewportWidth(carousel.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(carousel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pageCount <= 1) return;
    const timer = window.setInterval(() => setPage((currentPage) => currentPage + 1), 5500);
    return () => window.clearInterval(timer);
  }, [pageCount]);

  function moveCarousel(direction: -1 | 1) {
    setTransitionEnabled(true);
    setPage((currentPage) => {
      if (direction === 1 && currentPage === pageCount - 1) return pageCount;
      return (currentPage + direction + pageCount) % pageCount;
    });
  }

  return <>
    {cards.length ? <div ref={carouselRef} className="relative mt-6 overflow-hidden"><div className={`flex gap-4 px-8 ${transitionEnabled ? "transition-transform duration-700 ease-out" : ""} motion-reduce:transition-none`} onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === "transform" && page === pageCount) { setTransitionEnabled(false); setPage(0); window.requestAnimationFrame(() => window.requestAnimationFrame(() => setTransitionEnabled(true))); } }} style={{ transform: `translate3d(-${page * (slideWidth + 16)}px, 0, 0)` }}>{renderedPages.map((pageCards, pageIndex) => <div key={pageIndex} className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" style={{ width: slideWidth || "calc(100% - 4rem)" }}>{pageCards.map((card) => <article key={`${pageIndex}-${card.id}`} role="button" tabIndex={0} aria-label={`View ${card.name}`} onClick={() => setSelectedCard(card)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCard(card); } }} className="group cursor-zoom-in overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg outline-none transition duration-200 hover:-translate-y-1 hover:border-lime-300/40 hover:shadow-lime-300/10 focus-visible:ring-2 focus-visible:ring-lime-300"><div className="relative aspect-[3/4] overflow-hidden bg-garden-900"><img src={card.image_url} alt={card.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2 pt-6"><RarityLabel rarity={card.rarity} className="text-[9px] font-bold uppercase tracking-wider" /><span className="text-[10px] font-black text-amber-200">✦ {card.gardenValue.toLocaleString()}</span></div></div><div className="p-2.5"><h3 className="truncate text-xs font-bold text-white sm:text-sm">{card.name}</h3><div className="mt-2 flex min-w-0 items-center gap-1.5">{card.ownerId ? <><OwnerAvatar card={card} /><span className="truncate text-[10px] text-slate-400">{card.ownerName ?? "Gardener"}</span></> : <span className="text-[10px] text-slate-500">Garden catalog</span>}</div></div></article>)}</div>)}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Page {(page % pageCount) + 1} of {pageCount}</p><div className="flex items-center gap-2"><button type="button" aria-label="Previous characters page" onClick={() => moveCarousel(-1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-lime-300 hover:text-lime-200">←</button>{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-label={`Show characters page ${index + 1}`} aria-current={index === page % pageCount ? "page" : undefined} onClick={() => { setTransitionEnabled(true); setPage(index); }} className={`h-2 rounded-full transition-all ${index === page % pageCount ? "w-6 bg-lime-300" : "w-2 bg-slate-700 hover:bg-slate-500"}`} />)}<button type="button" aria-label="Next characters page" onClick={() => moveCarousel(1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-lime-300 hover:text-lime-200">→</button></div></div></div> : <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">The first characters are still growing.</p>}
    {selectedCard ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="dashboard-character-title" onMouseDown={() => setSelectedCard(null)}><div className="relative max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-white/15 bg-slate-900 p-4 shadow-2xl [animation:modal-glow_3s_ease-in-out_infinite]" style={{ "--modal-glow": glowColors[selectedCard.rarity] ?? glowColors.common } as CSSProperties} onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelectedCard(null)} aria-label="Close character preview" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-xl text-slate-200 transition hover:border-lime-300 hover:text-white">×</button><div className="overflow-hidden rounded-2xl bg-garden-950"><img src={selectedCard.image_url} alt={selectedCard.name} className="mx-auto max-h-[72vh] w-full object-contain" /></div><div className="px-1 pb-1 pt-5 sm:px-2"><div className="flex flex-wrap items-center gap-3"><h2 id="dashboard-character-title" className="text-2xl font-bold text-white">{selectedCard.name}</h2><RarityLabel rarity={selectedCard.rarity} className="text-sm font-bold uppercase tracking-wider" /></div><div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-300"><span className="rounded-full border border-amber-300/20 bg-amber-950/20 px-3 py-1 text-amber-200">✦ {selectedCard.gardenValue.toLocaleString()} garden value</span><span className="rounded-full border border-slate-700 px-3 py-1">Blooming rate {selectedCard.blooming_rate}/5</span><span className="rounded-full border border-slate-700 px-3 py-1">{ownerCounts[selectedCard.id] ?? 0} {ownerCounts[selectedCard.id] === 1 ? "owner" : "owners"}</span></div><div className="mt-5 border-t border-slate-800 pt-4">{selectedCard.ownerId ? <Link href={`/profile/${selectedCard.ownerId}`} className="group/owner inline-flex items-center gap-3 rounded-xl border border-sky-300/20 bg-sky-950/20 px-3 py-2 transition hover:border-sky-300/60"><OwnerAvatar card={selectedCard} large /><span><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Collected by</span><span className="block text-sm font-bold text-sky-200 group-hover/owner:text-white">{selectedCard.ownerName ?? "Gardener"} · View profile →</span></span></Link> : <p className="text-sm text-slate-500">This character is part of the garden catalog.</p>}</div></div></div></div> : null}
  </>;
}
