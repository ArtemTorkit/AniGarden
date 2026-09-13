import assert from "node:assert/strict";
import test from "node:test";
import { calculateGemsFromUsdCents, getSellValue } from "../lib/gacha/economy.ts";

test("rejects purchases below the four-dollar launch minimum", () => {
  assert.equal(calculateGemsFromUsdCents(300), 0);
});

test("calculates 120 promotional gems from a four-dollar purchase", () => {
  assert.equal(calculateGemsFromUsdCents(400), 120);
});

test("doubles the ten-dollar award including its bonus", () => {
  assert.equal(calculateGemsFromUsdCents(1000), 350);
});

test("doubles the fifteen-dollar award including its bonus", () => {
  assert.equal(calculateGemsFromUsdCents(1500), 550);
});

test("returns fixed sell values by rarity", () => {
  assert.equal(getSellValue("common"), 1);
  assert.equal(getSellValue("rare"), 2);
  assert.equal(getSellValue("epic"), 5);
  assert.equal(getSellValue("legendary"), 12);
});
