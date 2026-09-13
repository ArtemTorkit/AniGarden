# AniGarden

## Buy Me a Coffee setup

1. Add `BUYMEACOFFEE_PAGE_URL` and `BUYMEACOFFEE_WEBHOOK_SECRET` to the deployment environment.
2. Run `supabase db push` to apply the payment, rate-limit, variable-gem, character-selling, promo-code, and referral migrations (`0018`–`0025`).
3. In Buy Me a Coffee, create a webhook for `https://your-domain.com/api/webhooks/buymeacoffee` and subscribe to `donation.created` and `donation.refunded`.
4. Copy the webhook signing secret into `BUYMEACOFFEE_WEBHOOK_SECRET`, then redeploy.

Purchases use a claim code in the supporter note because Buy Me a Coffee's webhook identifies the payment, but does not provide an AniGarden user ID. Donations from $4 to $500 award 15 gems per USD, plus 25 bonus gems at $10 or more and 50 bonus gems at $15 or more. The launch promotion doubles the total reward through October 12, 2026. Paid gacha pulls cost 3 gems. Users can sell owned Common/Rare/Epic/Legendary characters for 1/2/5/12 gems respectively. The webhook verifies `x-signature-sha256`, recalculates the award from the verified USD amount, credits gems only once, and reverses the exact award if the donation is refunded.

## Promo codes

Promo codes are created from the Supabase SQL editor. Each code grants a fixed number of gems, can be limited to a maximum number of successful users, and can have optional UTC start and expiration times. A user can redeem each code only once.

```sql
insert into public.promo_codes (code, gem_amount, max_redemptions, starts_at, expires_at)
values ('WELCOME100', 100, 500, now(), '2026-12-31 23:59:59+00');
```

Use uppercase letters, numbers, hyphens, or underscores for codes. Leave `max_redemptions`, `starts_at`, or `expires_at` as `null` when no limit is needed.

## Referrals

Users can copy their invite link from their profile. When a new Google account registers through the link, both accounts receive 15 gems. Referral attribution and rewards are handled by the auth callback and the `complete_referral` database function.

## Monitoring

Create a Sentry Next.js project and add `NEXT_PUBLIC_SENTRY_DSN` to the deployment environment. `@sentry/nextjs` is configured through the Next.js instrumentation files. Rate limiting is database-backed and is enabled for gacha pulls, trade creation, and Buy Me a Coffee purchase intents after migration `0019` is applied.
