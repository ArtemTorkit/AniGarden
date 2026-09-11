import { bloomingRateMultipliers } from "@/lib/gacha/value";

export default function BloomStars({ bloomingRate }: { bloomingRate: number }) {
  const count = Math.min(5, Math.max(1, bloomingRate));
  const multiplier = bloomingRateMultipliers[count] ?? 1;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-300" title={`Blooming Rate ${count} of 5 · ${multiplier}× card value`} aria-label={`Blooming Rate ${count} of 5 · ${multiplier} times card value`}>
      <span aria-hidden="true">{"★".repeat(count)}</span><span aria-hidden="true" className="text-slate-700">{"★".repeat(5 - count)}</span>
    </span>
  );
}
