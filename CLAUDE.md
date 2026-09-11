# Anime Gacha MVP — Project Specs & Context

## Tech Stack & Hosting
- **Framework:** Next.js (App Router, TypeScript) — **Unified Full-Stack Architecture**
- **Hosting:** Vercel (Hobby Tier). The frontend and backend are NOT split. All backend logic must run securely inside Next.js Serverless API routes (`/app/api/...`).
- **Database & Auth:** Supabase (Free Tier PostgreSQL, Auth, Realtime).
- **Payments:** Stripe Checkout API & Webhooks.
- **Styling:** Tailwind CSS.

## Core Security & Architectural Rules
1. **Server-Side RNG Only:** The React client MUST NEVER run drop logic or mutate `User_Inventory` directly. All drop RNG and database writes MUST occur in Node.js server routes (`/app/api/...`).
2. **Stripe Webhook Verification:** Always cryptographically verify Stripe signatures using `stripe.webhooks.constructEvent` inside API routes before granting inventory items.
3. **Environment Key Separation:** `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must remain strictly server-side. Never expose them to the browser or use `NEXT_PUBLIC_` prefixes on them.
4. **Closed-Loop Economy:** No cash-out, fiat withdrawal, or external value conversion mechanisms exist.
5. **Asynchronous P2P Swaps Only:** Do NOT implement a global marketplace or live order book. Use one-time unique shareable URLs for character swaps.

## Database Schema (Supabase)
- `Users`: Handled by Supabase Auth (`auth.users`).
- `Characters`: `id` (uuid), `name` (text), `rarity_weight` (int), `image_url` (text).
- `User_Inventory`: `id` (uuid), `user_id` (fk -> auth.users), `character_id` (fk -> Characters), `acquired_at` (timestamp).
- `Trade_Offers`: `id` (uuid), `creator_inventory_id` (fk -> User_Inventory), `status` (text: 'pending', 'completed', 'cancelled'), `created_at` (timestamp).
- `Chat_Messages`: `id` (uuid), `user_id` (fk -> auth.users), `content` (text), `created_at` (timestamp).

## Development & Deployment Commands
- Start Dev Server: `npm run dev`
- Build: `npm run build`
- Type Check: `npm run type-check`
- Deploy: Connect GitHub repository to Vercel for automated full-stack deployments.
