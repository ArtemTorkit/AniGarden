# Gem Economy and Character Selling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Change the MVP economy to 15 gems per USD, 3 gems per paid pull, and secure fixed-rarity character selling.

**Architecture:** Keep all balance mutations in the existing server/API and Supabase ledger architecture. Add one database transaction for selling an inventory row, expose it through a server-authenticated route, and let the profile inventory UI call that route and refresh server-rendered balance/inventory data.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL migrations/RPC, React, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-12-gem-economy-and-character-selling-design.md`

## Global Constraints

- Server-side RNG only; the client never mutates inventory or gem balances.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- Selling has no cash-out or external value.
- A character reserved by a pending trade cannot be sold.
- All balance changes use completed `gem_transactions` ledger rows.

---

### Task 1: Add testable economy helpers

**Files:**
- Create: `lib/gacha/economy.ts`
- Create: `tests/economy.test.mjs`
- Modify: `package.json`

- [ ] Write failing tests for `$1 = 15`, `$10 = 175`, `$15 = 275`, and sell values Common 1, Rare 2, Epic 5, Legendary 12.
- [ ] Run `npm test` and confirm the tests fail because the helper/script does not exist.
- [ ] Implement the shared constants and pure functions.
- [ ] Run `npm test` and confirm all economy tests pass.
- [ ] Update Buy Me a Coffee code and display to consume the helper.

### Task 2: Update database economy rules

**Files:**
- Create: `supabase/migrations/0022_gem_economy_and_selling.sql`

- [ ] Add a migration replacing the Buy Me a Coffee RPC calculation with 15 gems per USD and bonuses of 25 at $10 and 50 at $15.
- [ ] Set active paid banners to `cost_gems = 3` while preserving daily-free banners.
- [ ] Extend the ledger kind constraint with `sell`.
- [ ] Add a security-definer `sell_inventory_character(p_user_id uuid, p_inventory_id uuid)` function that locks and deletes the owned inventory row, rejects pending trade reservations, and inserts the correct sell transaction atomically.
- [ ] Grant execution only to `service_role`.

### Task 3: Add the secure sell API and profile UI

**Files:**
- Create: `app/api/inventory/sell/route.ts`
- Modify: `components/InventoryGrid.tsx`
- Modify: `components/ProfileInventorySection.tsx`
- Modify: `app/profile/page.tsx`

- [ ] Add an authenticated POST route accepting exactly one inventory ID, applying rate limiting, and calling the service-role sell RPC.
- [ ] Add a confirmation action to each inventory card showing the fixed rarity sell value.
- [ ] Refresh the profile after a successful sale so inventory, gem balance, counts, and garden value update.
- [ ] Display clear errors for missing ownership, pending trades, and already-sold inventory.

### Task 4: Update user-facing pricing and documentation

**Files:**
- Modify: `components/BuyMeACoffeePurchase.tsx`
- Modify: `app/payments/page.tsx`
- Modify: `README.md`

- [ ] Change purchase copy to 15 gems per dollar and the updated threshold bonuses.
- [ ] Change pull-price copy to 3 gems.
- [ ] Document selling values and the no-cash-out rule.

### Task 5: Verify

- [ ] Run `npm test`.
- [ ] Run `npm run type-check`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Review migration ordering and provide the production commands `supabase db push` and Vercel redeploy instructions.
