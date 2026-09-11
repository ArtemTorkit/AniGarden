-- Gacha banners keep character pools separate so AniGarden can support
-- multiple themed gachas in the future.
create table if not exists public.gacha_banners (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text not null,
  cover_image_url  text not null,
  cost_gems        int not null default 1 check (cost_gems > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.gacha_banner_characters (
  banner_id     uuid not null references public.gacha_banners(id) on delete cascade,
  character_id  uuid not null references public."Characters"(id) on delete cascade,
  rarity_weight int not null check (rarity_weight >= 0),
  primary key (banner_id, character_id)
);

alter table public.gacha_banners enable row level security;
alter table public.gacha_banner_characters enable row level security;

drop policy if exists "gacha_banners_select_active" on public.gacha_banners;
create policy "gacha_banners_select_active"
  on public.gacha_banners for select to anon, authenticated
  using (is_active = true);

drop policy if exists "gacha_banner_characters_select_public" on public.gacha_banner_characters;
create policy "gacha_banner_characters_select_public"
  on public.gacha_banner_characters for select to anon, authenticated
  using (exists (
    select 1 from public.gacha_banners banner
    where banner.id = banner_id and banner.is_active = true
  ));

insert into public.gacha_banners
  (slug, name, description, cover_image_url, cost_gems)
select
  'mosswood-beginnings',
  'Mosswood Beginnings',
  'Meet the first residents of AniGarden: a sprout courier, a moonpond oracle, and the guardian of the Gardenheart.',
  'https://ghcctymglxgaxysdfvqi.supabase.co/storage/v1/object/public/photos/2026-08-30_17-05-03_1451.png',
  1
where not exists (
  select 1 from public.gacha_banners where slug = 'mosswood-beginnings'
);

insert into public.gacha_banner_characters (banner_id, character_id, rarity_weight)
select banner.id, character.id, character.rarity_weight
from public.gacha_banners banner
join public."Characters" character
  on character.name in ('Mallow Moss', 'Lunara Bell', 'Elowen Verdant')
where banner.slug = 'mosswood-beginnings'
on conflict (banner_id, character_id) do nothing;
