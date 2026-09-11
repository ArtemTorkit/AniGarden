-- Anime Gacha MVP — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Tables: Characters, User_Inventory

-- ─────────────────────────────────────────────
-- Characters
-- ─────────────────────────────────────────────
create table if not exists public."Characters" (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  rarity_weight int  not null check (rarity_weight >= 0),
  image_url     text not null,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- User_Inventory
-- ─────────────────────────────────────────────
create table if not exists public."User_Inventory" (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  character_id  uuid not null references public."Characters"(id) on delete cascade,
  acquired_at   timestamptz not null default now()
);

create index if not exists user_inventory_user_id_idx
  on public."User_Inventory"(user_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table public."Characters"     enable row level security;
alter table public."User_Inventory" enable row level security;

-- Characters: readable by everyone (catalog); writes only via service role.
drop policy if exists "characters_select_public" on public."Characters";
create policy "characters_select_public"
  on public."Characters" for select
  to anon, authenticated
  using (true);

-- User_Inventory: a user can read only their own rows.
drop policy if exists "inventory_select_own" on public."User_Inventory";
create policy "inventory_select_own"
  on public."User_Inventory" for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes to User_Inventory (insert) must happen server-side via the
-- service-role client (which bypasses RLS). No client-side insert policy
-- is granted — enforcing the "server-side RNG only" rule.
