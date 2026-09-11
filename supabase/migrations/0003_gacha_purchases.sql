-- Tracks paid gacha packs and makes Stripe webhook processing idempotent.
create table if not exists public.gacha_purchases (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  user_id           uuid not null references auth.users(id) on delete cascade,
  pull_count        int not null check (pull_count > 0),
  status            text not null default 'processing'
                    check (status in ('processing', 'completed', 'failed')),
  inventory_ids     uuid[] not null default '{}',
  created_at        timestamptz not null default now(),
  processed_at      timestamptz
);

create index if not exists gacha_purchases_user_id_idx
  on public.gacha_purchases(user_id);

alter table public.gacha_purchases enable row level security;

drop policy if exists "gacha_purchases_select_own" on public.gacha_purchases;
create policy "gacha_purchases_select_own"
  on public.gacha_purchases for select
  to authenticated
  using (auth.uid() = user_id);
