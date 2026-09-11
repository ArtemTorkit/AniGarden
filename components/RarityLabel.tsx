const rarityTextStyles: Record<string, string> = {
  common: "text-slate-300",
  uncommon: "text-lime-300",
  rare: "text-sky-300",
  epic: "text-fuchsia-300",
  legendary: "text-amber-200",
};

export default function RarityLabel({ rarity, className = "" }: { rarity: string; className?: string }) {
  return (
    <span className={`capitalize ${rarityTextStyles[rarity.toLowerCase()] ?? "text-lime-300"} ${className}`}>
      {rarity}
    </span>
  );
}
