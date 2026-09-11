export default function GardenPrestigeGuide() {
  return (
    <details className="group mt-5 overflow-hidden rounded-3xl border border-lime-300/20 bg-gradient-to-br from-garden-900 via-slate-900 to-slate-950 text-sm text-slate-300 shadow-lg shadow-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
        <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-xl">🌿</span><span><span className="block font-bold text-white">How Garden Value works</span><span className="mt-1 block text-xs text-slate-500">Understand the value of every card you grow</span></span></span>
        <span className="text-xl text-lime-300 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-lime-300/10 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 p-4"><span className="text-xs font-bold text-lime-300">01</span><p className="mt-2 font-semibold text-white">Collect cards</p><p className="mt-1 text-xs leading-5 text-slate-500">Rarity sets the base value: 100 Common, 250 Uncommon, 750 Rare, 1,500 Epic, or 3,000 Legendary.</p></div>
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 p-4"><span className="text-xs font-bold text-lime-300">02</span><p className="mt-2 font-semibold text-white">Find your rate</p><p className="mt-1 text-xs leading-5 text-slate-500">Every pull gets an independent Blooming Rate from 1 to 5. The stars on the card show its rate.</p></div>
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 p-4"><span className="text-xs font-bold text-lime-300">03</span><p className="mt-2 font-semibold text-white">Grow your score</p><p className="mt-1 text-xs leading-5 text-slate-500">Multiply each card’s base value by its Blooming Rate multiplier, then add your cards together.</p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Blooming Rate odds & multipliers</p><div className="mt-3 grid grid-cols-5 gap-2 text-center">{[[1, "50%", "1×"], [2, "25%", "1.25×"], [3, "15%", "1.5×"], [4, "7%", "2×"], [5, "3%", "3×"]].map(([rate, odds, multiplier]) => <div key={rate} className="rounded-xl bg-slate-950/50 px-1 py-2"><p className="text-amber-300">{"★".repeat(Number(rate))}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{odds}</p><p className="text-[10px] font-bold text-white">{multiplier}</p></div>)}</div></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime-300/15 bg-garden-950/60 px-4 py-3"><span className="text-xs text-slate-400"><span className="font-semibold text-lime-200">Example:</span> Rare 750 × Rate 3 (1.5×)</span><span className="font-bold text-amber-200">= 1,125 Garden Value</span></div>
        <p className="mt-4 text-[11px] text-slate-500">Garden Value is a display score, not spendable gems.</p>
      </div>
    </details>
  );
}
