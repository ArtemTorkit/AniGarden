-- Closed-loop AniGarden currency ledger.
-- Positive amounts credit gems; future pull spends will use negative amounts.
create table if not exists public.gem_transactions (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  user_id           uuid not null references auth.users(id) on delete cascade,
  amount            int not null check (amount <> 0),
  kind              text not null check (kind in ('purchase', 'pull_spend', 'refund')),
  status            text not null default 'completed'
                    check (status in ('completed', 'failed')),
  created_at        timestamptz not null default now()
);

create index if not exists gem_transactions_user_id_idx
  on public.gem_transactions(user_id);

alter table public.gem_transactions enable row level security;

drop policy if exists "gem_transactions_select_own" on public.gem_transactions;
create policy "gem_transactions_select_own"
  on public.gem_transactions for select
  to authenticated
  using (auth.uid() = user_id);
