import assert from "node:assert/strict";
import test from "node:test";
import { sortInventoryItems } from "../lib/gacha/inventory.ts";

const items = [
  { name: "Rare", rarity: "rare", blooming_rate: 1, acquired_at: "2026-09-01" },
  { name: "Common", rarity: "common", blooming_rate: 1, acquired_at: "2026-09-02" },
  { name: "Legendary", rarity: "legendary", blooming_rate: 1, acquired_at: "2026-09-03" },
];

test("sorts inventory by garden value descending by default", () => {
  assert.deepEqual(sortInventoryItems(items, "value-desc").map((item) => item.name), ["Legendary", "Rare", "Common"]);
});

test("sorts inventory by rarity in ascending or descending order", () => {
  assert.deepEqual(sortInventoryItems(items, "rarity-asc").map((item) => item.name), ["Common", "Rare", "Legendary"]);
  assert.deepEqual(sortInventoryItems(items, "rarity-desc").map((item) => item.name), ["Legendary", "Rare", "Common"]);
});
