-- Supports banners that grant one free pull per user per UTC day.
alter table public.gacha_banners add column if not exists daily_free boolean not null default false;

alter table public.gacha_banners drop constraint if exists gacha_banners_cost_gems_check;
alter table public.gacha_banners add constraint gacha_banners_cost_gems_check check (cost_gems >= 0);

create table if not exists public.daily_gacha_claims (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  banner_id  uuid not null references public.gacha_banners(id) on delete cascade,
  claimed_on date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  unique (user_id, banner_id, claimed_on)
);

create index if not exists daily_gacha_claims_user_idx on public.daily_gacha_claims(user_id, claimed_on);
alter table public.daily_gacha_claims enable row level security;

drop policy if exists "daily_gacha_claims_select_own" on public.daily_gacha_claims;
create policy "daily_gacha_claims_select_own"
  on public.daily_gacha_claims for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.claim_daily_gacha(p_user_id uuid, p_banner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended((p_user_id::text || p_banner_id::text), 0));
  insert into public.daily_gacha_claims (user_id, banner_id)
  values (p_user_id, p_banner_id);
  return true;
exception when unique_violation then
  return false;
end;
$$;

revoke all on function public.claim_daily_gacha(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_daily_gacha(uuid, uuid) to service_role;

insert into public.gacha_banners
  (slug, name, description, cover_image_url, cost_gems, daily_free)
select
  'daily-sprout',
  'Daily Sprout',
  'A free daily chance to discover one of the garden’s first residents.',
  'https://ghcctymglxgaxysdfvqi.supabase.co/storage/v1/object/public/photos/2026-08-30_17-06-06_8752.png',
  0,
  true
where not exists (
  select 1 from public.gacha_banners where slug = 'daily-sprout'
);

insert into public.gacha_banner_characters (banner_id, character_id, rarity_weight)
select banner.id, character.id, character.rarity_weight
from public.gacha_banners banner
join public."Characters" character
  on character.name in ('Mallow Moss', 'Lunara Bell', 'Elowen Verdant')
where banner.slug = 'daily-sprout'
on conflict (banner_id, character_id) do nothing;
