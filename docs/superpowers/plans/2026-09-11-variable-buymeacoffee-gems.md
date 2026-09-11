# Variable Buy Me a Coffee Gems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed Buy Me a Coffee gem packages with a variable USD donation flow that awards 3 gems per USD plus threshold bonuses.

**Architecture:** The signed Buy Me a Coffee webhook remains the source of truth for the payment amount. The purchase intent records the user and claim code, the server validates a minimum and maximum requested amount, and the webhook calculates the final gem award and records it transactionally. Existing idempotency and refund reversal remain in place.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL migrations/RPC, Buy Me a Coffee webhooks, Node.js HMAC verification.

**Spec:** Approved in conversation: 3 gems per USD; +5 gems for payments >= $10; +10 gems for payments >= $15; minimum $1; USD accounting.

## Global Constraints

- Server-side webhook verification and gem writes remain mandatory.
- `SUPABASE_SERVICE_ROLE_KEY` and `BUYMEACOFFEE_WEBHOOK_SECRET` remain server-only.
- Webhook processing must remain idempotent for duplicate events/payments.
- Refunds must remove the exact gem amount originally credited.
- No cash-out or external-value conversion is introduced.

---

### Task 1: Add deterministic gem-award calculation

**Files:**
- Modify: `lib/billing/buymeacoffee.ts`

- [x] Add `calculateGemsFromUsdCents(amountCents: number): number` using integer cents: `floor(amountCents * 3 / 100)`, then add 5 when amount is at least 1000 cents or 10 when at least 1500 cents.
- [x] Return zero for amounts below 100 cents and reject non-finite/negative input through the caller’s validation.
- [x] Keep the calculation server-safe and independent of UI code.

### Task 2: Replace fixed-package purchase intent UI and API

**Files:**
- Modify: `components/BuyMeACoffeePurchase.tsx`
- Modify: `app/billing/page.tsx`
- Modify: `app/api/billing/buymeacoffee/intent/route.ts`

- [x] Replace package cards with a USD amount input and show the calculated gem preview and bonus thresholds.
- [x] Validate an amount from $1.00 through $500.00 in the route using integer cents.
- [x] Generate the same one-time claim code and store the requested USD amount and calculated gem amount for reconciliation.
- [x] Keep rate limiting and authentication checks unchanged.
- [x] Make the copy state that the final credit occurs only after a matching signed webhook.
- [x] Add a short numbered tutorial in the purchase panel: choose donation amount, create/copy the claim code, paste it into the Buy Me a Coffee support note, then wait for confirmation.
- [x] Use plain language and make clear that the code must be included in the note for automatic crediting.

### Task 3: Add migration for variable purchase metadata and webhook calculation

**Files:**
- Create: `supabase/migrations/0021_variable_buymeacoffee_gems.sql`

- [x] Preserve the existing `gem_purchase_intents` data and constraints.
- [x] Add any required metadata/constraints for cents-based requested amounts without breaking existing credited or rejected intents.
- [x] Update `process_buymeacoffee_event` so `donation.created` validates USD and the requested amount, computes the gem award from the verified amount, credits it once, and stores the computed amount for refunds.
- [x] Keep `donation.refunded` idempotent and reverse the exact credited gem amount.
- [x] Keep duplicate event/payment behavior safe.

### Task 4: Update documentation and verify

**Files:**
- Modify: `app/payments/page.tsx`
- Modify: `README.md`

- [x] Document the variable donation formula and thresholds.
- [x] Document the $1 minimum, $500 maximum, USD webhook requirement, and claim-code flow.
- [x] Add the same concise tutorial to the payments help page so users can find it after leaving the billing screen.
- [x] Run `npm run type-check` and `npm run build`.
- [x] Review the migration SQL for compatibility with the existing `0018` and `0019` migrations.
