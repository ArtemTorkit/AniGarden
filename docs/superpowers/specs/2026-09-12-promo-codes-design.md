# Promo Codes Design

## Goal

Allow authenticated AniGarden users to redeem SQL-created promotional codes for gems. Each user may redeem a given code once, while each code may also have a global redemption limit.

## Rules

- Codes are trimmed and normalized to uppercase before lookup.
- Each code grants a fixed integer number of gems.
- `starts_at` and `expires_at` are optional UTC timestamps. A code is valid when the current database time is at or after `starts_at` and before `expires_at`.
- `max_redemptions` is optional. When present, successful redemptions cannot exceed it.
- A user can redeem a particular code only once.
- Redemption is available only to authenticated users.
- Promo redemption creates a completed `gem_transactions` row and a redemption audit row in one database transaction.
- The service-role API route is the only server entry point; clients never mutate promo or gem tables directly.
- Promo codes are created manually with SQL; no admin creation UI is included in this MVP.

## Data model

`promo_codes` stores the normalized unique code, reward, schedule, global limit, and creation time. `promo_code_redemptions` stores one row per successful user/code pair. A unique constraint on `(promo_code_id, user_id)` enforces one redemption per user.

## Server flow

`POST /api/promo-codes/redeem` authenticates the user, validates the request, and calls a `redeem_promo_code(uuid, text)` security-definer function. The function locks the selected code, checks schedule and usage, inserts the unique redemption and gem transaction, then returns the reward. This prevents duplicate grants and race-condition over-redemption.

## UI flow

The billing page includes a compact “Have a promo code?” form. It has an uppercase-friendly code input and redeem button. It displays success with the number of gems added and actionable errors for invalid, already-used, not-yet-active, expired, or exhausted codes. The header balance updates immediately after success.

## SQL creation example

```sql
insert into public.promo_codes (code, gem_amount, max_redemptions, starts_at, expires_at)
values ('WELCOME100', 100, 500, now(), '2026-12-31 23:59:59+00');
```

## Out of scope

Admin UI, code batches, percentage discounts, cash value, anonymous redemption, and transferability.
