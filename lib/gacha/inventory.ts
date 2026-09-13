import { getCardValue } from "./value.ts";

export type InventorySort = "value-desc" | "rarity-asc" | "rarity-desc";

type SortableInventoryItem = {
  name: string;
  rarity: string;
  blooming_rate?: number | null;
  acquired_at: string;
};

const rarityOrder: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function sortInventoryItems<T extends SortableInventoryItem>(items: T[], sort: InventorySort) {
  return [...items].sort((left, right) => {
    if (sort === "value-desc") {
      const valueDifference = getCardValue(right.rarity, right.blooming_rate ?? 1) - getCardValue(left.rarity, left.blooming_rate ?? 1);
      if (valueDifference !== 0) return valueDifference;
    } else {
      const leftRarity = rarityOrder[left.rarity.toLowerCase()] ?? -1;
      const rightRarity = rarityOrder[right.rarity.toLowerCase()] ?? -1;
      const rarityDifference = leftRarity - rightRarity;
      if (rarityDifference !== 0) return sort === "rarity-asc" ? rarityDifference : -rarityDifference;
    }

    return left.name.localeCompare(right.name) || right.acquired_at.localeCompare(left.acquired_at);
  });
}
