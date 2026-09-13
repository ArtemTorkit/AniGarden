import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedPaidPullCount } from "../lib/gacha/pulls.ts";

test("supports one, five, and ten paid pulls", () => {
  assert.equal(isSupportedPaidPullCount(1), true);
  assert.equal(isSupportedPaidPullCount(5), true);
  assert.equal(isSupportedPaidPullCount(10), true);
});

test("rejects unsupported paid pull counts", () => {
  assert.equal(isSupportedPaidPullCount(0), false);
  assert.equal(isSupportedPaidPullCount(2), false);
  assert.equal(isSupportedPaidPullCount(11), false);
});
