"use client";

import { useEffect, useState } from "react";
import RarityLabel from "@/components/RarityLabel";
import BloomStars from "@/components/BloomStars";
import { useAuthPrompt } from "@/components/AuthPromptProvider";

type Character = { name: string; rarity: string; image_url: string; edition_number?: number; blooming_rate?: number; pull_id?: string };

const rarityGlow: Record<string, string> = {
  common: "bg-slate-300/20 shadow-[0_0_55px_18px_rgba(203,213,225,0.22)]",
  uncommon: "bg-lime-300/25 shadow-[0_0_65px_22px_rgba(163,230,53,0.4)]",
  rare: "bg-sky-300/25 shadow-[0_0_65px_22px_rgba(56,189,248,0.42)]",
  epic: "bg-fuchsia-300/25 shadow-[0_0_65px_22px_rgba(232,121,249,0.45)]",
  legendary: "bg-amber-300/30 shadow-[0_0_75px_25px_rgba(252,211,77,0.5)]",
};

const rarityRank: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
const rarityColors = ["common", "uncommon", "rare", "epic", "legendary"];

function highestRarity(characters: Character[]) {
  return characters.reduce((highest, character) => (rarityRank[character.rarity] ?? 0) > (rarityRank[highest] ?? 0) ? character.rarity : highest, "common");
}

export default function PlantPullExperience({ bannerSlug, costGems, dailyFree, dailyPullAvailable = true }: { bannerSlug: string; costGems: number; dailyFree: boolean; dailyPullAvailable?: boolean }) {
  const { openLoginPrompt } = useAuthPrompt();
  const [stage, setStage] = useState<"idle" | "planting" | "growing" | "blooming" | "revealed">("idle");
  const [results, setResults] = useState<Character[]>([]);
  const [selectedCount, setSelectedCount] = useState<1 | 5 | 10>(1);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [revealRarity, setRevealRarity] = useState("common");
  const [orbitRarity, setOrbitRarity] = useState("common");

  useEffect(() => {
    if (stage === "blooming") {
      setOrbitRarity(revealRarity);
      return;
    }
    if (stage !== "growing") return;
    const timer = window.setInterval(() => {
      setOrbitRarity(rarityColors[Math.floor(Math.random() * rarityColors.length)]);
    }, 420);
    return () => window.clearInterval(timer);
  }, [stage, revealRarity]);

  function playTone(frequency: number, duration = 0.24, delay = 0) {
    if (muted || typeof window === "undefined") return;
    window.setTimeout(() => {
      const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = new AudioContextConstructor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration + 0.03);
      window.setTimeout(() => void context.close(), (duration + 0.1) * 1000);
    }, delay);
  }

  async function pull() {
    if (dailyFree && !dailyPullAvailable) return;
    setStage("planting"); setResults([]); setError(null); setRevealRarity("common"); setOrbitRarity("common");
    try {
      const response = await fetch("/api/gacha/pull", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bannerSlug, count: selectedCount }) });
      const result = await response.json();
      if (response.status === 401) { setStage("idle"); openLoginPrompt("Sign in with Google to plant a pull and add characters to your collection."); return; }
      if (response.status === 402) { window.location.assign("/billing?reason=insufficient-gems"); return; }
      if (!response.ok) throw new Error(result.error ?? "Unable to complete pull");
      setRevealRarity(highestRarity(result.characters));
      setStage("growing");
      playTone(220, 0.3);
      playTone(330, 0.3, 180);
      playTone(440, 0.35, 360);
      await new Promise((resolve) => setTimeout(resolve, selectedCount === 1 ? 1500 : 1900));
      setStage("blooming");
      playTone(523, 0.5);
      playTone(659, 0.5, 100);
      playTone(784, 0.65, 200);
      await new Promise((resolve) => setTimeout(resolve, selectedCount === 1 ? 1200 : 1600));
      setResults(result.characters);
      setStage("revealed");
      if (!dailyFree) {
        window.dispatchEvent(new CustomEvent("anigarden:gems-updated", { detail: { amount: -(costGems * selectedCount) } }));
      }
    } catch (pullError) {
      setStage("idle"); setError(pullError instanceof Error ? pullError.message : "Unable to complete pull");
    }
  }

  return (
    <div className="mt-2">
      <div className={`gacha-reveal-stage gacha-stage-${stage} reveal-rarity-${revealRarity} relative mx-auto flex min-h-[360px] w-full max-w-4xl items-center justify-center overflow-hidden rounded-3xl border border-lime-300/30 bg-[radial-gradient(ellipse_at_center,_rgba(132,204,22,0.28),_rgba(16,35,24,0.8)_48%,_rgba(2,6,23,1)_100%)] p-6 shadow-2xl shadow-lime-950/30 transition-shadow duration-1000 sm:min-h-[440px] sm:p-10 ${stage === "planting" || stage === "growing" ? "animate-pulse shadow-lime-300/20" : stage === "blooming" ? "shadow-lime-300/50" : ""}`}>
        <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Turn sound on" : "Mute sound"} aria-pressed={muted} title={muted ? "Turn sound on" : "Mute sound"} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/70 text-lg text-slate-200 backdrop-blur transition hover:border-lime-300 hover:text-lime-200">{muted ? "🔇" : "🔊"}</button>
        <div className="pointer-events-none absolute -inset-24 rounded-full border border-lime-300/10 [animation:garden-orbit_22s_linear_infinite]" />
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-lime-300/10 blur-3xl [animation:garden-orbit_14s_ease-in-out_infinite_reverse]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
          <span className="absolute left-[12%] top-[20%] text-2xl text-lime-300/70 [animation:garden-float_5s_ease-in-out_infinite]">✦</span>
          <span className="absolute right-[16%] top-[18%] text-xl text-lime-200/60 [animation:garden-float_6s_ease-in-out_infinite_500ms]">✧</span>
          <span className="absolute bottom-[20%] left-[22%] text-lg text-lime-400/60 [animation:garden-float_7s_ease-in-out_infinite_300ms]">❧</span>
          <span className="absolute bottom-[18%] right-[20%] text-2xl text-lime-200/70 [animation:garden-float_5.5s_ease-in-out_infinite_700ms]">❧</span>
          <span className="absolute left-[35%] top-[14%] h-1.5 w-1.5 rounded-full bg-lime-200 shadow-[0_0_14px_4px_rgba(190,242,100,0.7)] [animation:garden-drift_4s_ease-in-out_infinite]" />
          <span className="absolute bottom-[22%] right-[35%] h-1 w-1 rounded-full bg-lime-300 shadow-[0_0_12px_3px_rgba(190,242,100,0.7)] [animation:garden-drift_5s_ease-in-out_infinite_800ms]" />
        </div>
        {results.length ? <div className={`relative w-full justify-items-center gap-4 ${results.length === 1 ? "flex min-h-[300px] max-w-[240px] items-center justify-center sm:max-w-[280px]" : "grid grid-cols-2 sm:grid-cols-5"}`}>
          {results.map((character, index) => <article key={`${character.name}-${index}`} className="mx-auto w-full text-center [animation:character-reveal_0.8s_ease-out_both]" style={{ animationDelay: `${index * 90}ms` }}><div className="relative mx-auto aspect-square w-full overflow-visible rounded-2xl p-1"><div className={`absolute inset-8 rounded-full blur-2xl [animation:rarity-shine_2.8s_ease-in-out_infinite] ${rarityGlow[character.rarity] ?? rarityGlow.common}`} /><div className={`absolute inset-2 rounded-2xl opacity-70 blur-md ${rarityGlow[character.rarity] ?? rarityGlow.common}`} /><img src={character.image_url} alt={character.name} className="relative z-10 h-full w-full rounded-2xl object-cover shadow-xl shadow-black/40" /></div><div className="mt-3 border-t border-white/10 pt-3"><div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider"><RarityLabel rarity={character.rarity} />{character.blooming_rate ? <BloomStars bloomingRate={character.blooming_rate} /> : null}</div><h2 className="mt-2 truncate text-sm font-bold text-white">{character.name}</h2>{character.edition_number ? <p title="Edition number: this character’s place in the global collection" className="mt-1 cursor-help text-[10px] font-semibold text-slate-500">Edition #{character.edition_number}</p> : null}</div></article>)}
        </div> : <div className="relative text-center"><div className="gacha-center-icons relative inline-block">{stage !== "idle" ? <div className={`gacha-orbit reveal-rarity-${orbitRarity} pointer-events-none absolute left-1/2 top-1/2 z-0 h-56 w-56 -translate-x-1/2 -translate-y-1/2 sm:h-72 sm:w-72`} aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index} className={`gacha-orbit-light gacha-orbit-light-${index + 1}`} />)}<span className="gacha-reveal-burst" /></div> : null}<div className={`relative z-10 text-8xl ${stage === "planting" ? "animate-bounce" : stage === "growing" ? "animate-[garden-grow_1.5s_ease-in-out_infinite]" : stage === "blooming" ? "animate-[garden-bloom_1.2s_ease-out_both]" : "animate-[spin_8s_linear_infinite]"}`}>{stage === "planting" ? "🌱" : stage === "growing" ? "🌿" : stage === "blooming" ? "🌸" : "💎"}</div><div className="relative z-10 mt-6 flex justify-center gap-2 text-xl text-lime-300"><span className="animate-bounce">✦</span><span className="animate-bounce [animation-delay:150ms]">✦</span><span className="animate-bounce [animation-delay:300ms]">✦</span></div></div>{stage === "idle" ? <p className="mt-4 text-sm text-slate-300">Plant a gem and see what grows.</p> : null}</div>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {!dailyFree && <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-1"><button type="button" onClick={() => setSelectedCount(1)} disabled={stage !== "idle" && stage !== "revealed"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedCount === 1 ? "bg-lime-300 text-garden-950" : "text-slate-300"}`}>1 · 💎 {costGems}</button><button type="button" onClick={() => setSelectedCount(5)} disabled={stage !== "idle" && stage !== "revealed"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedCount === 5 ? "bg-lime-300 text-garden-950" : "text-slate-300"}`}>5 · 💎 {costGems * 5}</button><button type="button" onClick={() => setSelectedCount(10)} disabled={stage !== "idle" && stage !== "revealed"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedCount === 10 ? "bg-lime-300 text-garden-950" : "text-slate-300"}`}>10 · 💎 {costGems * 10}</button></div>}
        <button type="button" onClick={pull} disabled={(stage !== "idle" && stage !== "revealed") || (dailyFree && !dailyPullAvailable)} className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">{stage !== "idle" && stage !== "revealed" ? "Growing…" : results.length ? "Plant again" : dailyFree && !dailyPullAvailable ? "Come back tomorrow" : dailyFree ? "Plant today’s free pull" : `Plant ${selectedCount === 1 ? "a pull" : `${selectedCount} pulls`}`}</button>
      </div>
      {dailyFree ? <p className={`mt-3 text-center text-xs ${dailyPullAvailable ? "text-lime-200/70" : "text-slate-400"}`}>{dailyPullAvailable ? "One free pull available each day" : "You’ve already claimed today’s free pull. A new pull will be available tomorrow."}</p> : null}
      {error ? <p className="mt-3 text-center text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
