export const rarityValues: Record<string, number> = {
  common: 100,
  uncommon: 250,
  rare: 750,
  epic: 1500,
  legendary: 3000,
};

export const bloomingRateMultipliers: Record<number, number> = {
  1: 1,
  2: 1.25,
  3: 1.5,
  4: 2,
  5: 3,
};

export function getCardValue(rarity: string, bloomingRate = 1) {
  return (rarityValues[rarity.toLowerCase()] ?? 0) * (bloomingRateMultipliers[bloomingRate] ?? 1);
}

export function getInventoryValue(cards: Array<string | { rarity: string; blooming_rate?: number | null }>) {
  return cards.reduce((total, card) => {
    const rarity = typeof card === "string" ? card : card.rarity;
    const bloomingRate = typeof card === "string" ? 1 : card.blooming_rate ?? 1;
    return total + getCardValue(rarity, bloomingRate);
  }, 0);
}
