# Promo Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, SQL-created gem promo codes with one redemption per user and optional global usage limits.

**Architecture:** Store codes and successful redemptions in Supabase. Expose one authenticated Next.js route that calls an atomic security-definer RPC, and add a client form to the billing page. Keep creation SQL-only for the MVP.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-12-promo-codes-design.md`

## Global Constraints

- Server-side validation and database writes only.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- Codes are trimmed and uppercased.
- One successful redemption per user/code pair.
- Optional global maximum, UTC start/end timestamps.
- Promo grants are closed-loop gems with `kind = 'promo'` and `status = 'completed'`.

---

### Task 1: Add promo-code database model and atomic RPC

**Files:**
- Create: `supabase/migrations/0023_promo_codes.sql`

**Interfaces:**
- Produces `public.redeem_promo_code(p_user_id uuid, p_code text)` returning `gem_amount int`.

- [ ] **Step 1: Create tables, constraints, indexes, and RLS policies.**
- [ ] **Step 2: Add the `promo` transaction kind without removing existing kinds.**
- [ ] **Step 3: Implement the locked validation, unique redemption insert, and gem transaction insert in the RPC.**
- [ ] **Step 4: Grant RPC execution only to `service_role`.**
- [ ] **Step 5: Run the migration SQL in a disposable/local Supabase database or review it against existing schema.**

### Task 2: Add pure promo validation helpers and tests

**Files:**
- Create: `lib/gacha/promo-codes.ts`
- Create: `tests/promo-codes.test.ts`

**Interfaces:**
- `normalizePromoCode(value: unknown): string`
- `isValidPromoCodeFormat(code: string): boolean`

- [ ] **Step 1: Write tests for trimming, uppercasing, empty input, and a bounded code format.**
- [ ] **Step 2: Run `npm test` and verify the new tests fail before implementation.**
- [ ] **Step 3: Implement normalization and format validation without database access.**
- [ ] **Step 4: Run `npm test` and verify all tests pass.**

### Task 3: Add authenticated redemption API route

**Files:**
- Create: `app/api/promo-codes/redeem/route.ts`
- Modify: `lib/security/rate-limit.ts` if an existing helper needs a named limit.

**Interfaces:**
- `POST /api/promo-codes/redeem` accepts `{ code: string }` and returns `{ gems: number }` on success or a safe user-facing error on failure.

- [ ] **Step 1: Authenticate with the existing server Supabase client.**
- [ ] **Step 2: Normalize and validate the code before calling the admin RPC.**
- [ ] **Step 3: Apply the existing rate-limit pattern and call `redeem_promo_code`.**
- [ ] **Step 4: Map database errors to clear 400/409 responses without exposing internals.**
- [ ] **Step 5: Return the granted gem amount for the UI balance event.**

### Task 4: Add billing-page redemption UI

**Files:**
- Create: `components/PromoCodeRedeemer.tsx`
- Modify: `app/billing/page.tsx`

**Interfaces:**
- `PromoCodeRedeemer` renders an authenticated-aware code form and dispatches `anigarden:gems-updated` with the granted amount.

- [ ] **Step 1: Add the form with uppercase-friendly input and loading state.**
- [ ] **Step 2: Show success, duplicate, invalid, inactive, expired, and exhausted messages.**
- [ ] **Step 3: Add the component to the billing page near the gem purchase section.**
- [ ] **Step 4: Keep the form usable on mobile and prevent duplicate submissions.**

### Task 5: Document SQL creation and verify the feature

**Files:**
- Modify: `README.md` or the existing payment documentation.

- [ ] **Step 1: Add a copyable SQL example with fixed reward, global cap, and UTC expiration.**
- [ ] **Step 2: Run `npm test`.**
- [ ] **Step 3: Run `npm run type-check`.**
- [ ] **Step 4: Run `npm run build` alone.**
- [ ] **Step 5: Run `git diff --check`.**
