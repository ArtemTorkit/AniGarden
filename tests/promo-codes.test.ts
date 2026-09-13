import assert from "node:assert/strict";
import test from "node:test";
import { isValidPromoCodeFormat, normalizePromoCode } from "../lib/gacha/promo-codes.ts";

test("normalizes promo codes for lookup", () => {
  assert.equal(normalizePromoCode("  welcome-100 "), "WELCOME-100");
  assert.equal(normalizePromoCode(null), "");
});

test("accepts bounded uppercase promo code formats", () => {
  assert.equal(isValidPromoCodeFormat("WELCOME-100"), true);
  assert.equal(isValidPromoCodeFormat("A"), false);
  assert.equal(isValidPromoCodeFormat("WELCOME CODE"), false);
  assert.equal(isValidPromoCodeFormat("welcome-100"), false);
});

test("rejects empty and oversized promo codes", () => {
  assert.equal(isValidPromoCodeFormat(""), false);
  assert.equal(isValidPromoCodeFormat("A".repeat(33)), false);
});
