# AniGarden

## Buy Me a Coffee setup

1. Add `BUYMEACOFFEE_PAGE_URL` and `BUYMEACOFFEE_WEBHOOK_SECRET` to the deployment environment.
2. Run `supabase db push` to apply the payment, rate-limit, and variable-gem migrations (`0018`, `0019`, and `0021`).
3. In Buy Me a Coffee, create a webhook for `https://your-domain.com/api/webhooks/buymeacoffee` and subscribe to `donation.created` and `donation.refunded`.
4. Copy the webhook signing secret into `BUYMEACOFFEE_WEBHOOK_SECRET`, then redeploy.

Purchases use a claim code in the supporter note because Buy Me a Coffee's webhook identifies the payment, but does not provide an AniGarden user ID. Donations from $1 to $500 award 3 gems per USD, plus 5 bonus gems at $10 or more and 10 bonus gems at $15 or more. The webhook verifies `x-signature-sha256`, recalculates the award from the verified USD amount, credits gems only once, and reverses the exact award if the donation is refunded.

## Monitoring

Create a Sentry Next.js project and add `NEXT_PUBLIC_SENTRY_DSN` to the deployment environment. `@sentry/nextjs` is configured through the Next.js instrumentation files. Rate limiting is database-backed and is enabled for gacha pulls, trade creation, and Buy Me a Coffee purchase intents after migration `0019` is applied.
