-- AniGarden catalog metadata and starter characters.
-- Safe to run after 0001_init.sql. Existing names are not duplicated.

alter table public."Characters"
  add column if not exists rarity text not null default 'common';

insert into public."Characters"
  (name, rarity, rarity_weight, image_url)
select
  seed.name,
  seed.rarity,
  seed.rarity_weight,
  seed.image_url
from (
  values
    (
      'Mallow Moss',
      'common',
      20,
      'https://ghcctymglxgaxysdfvqi.supabase.co/storage/v1/object/public/photos/2026-08-30_17-05-03_1451.png'
    ),
    (
      'Lunara Bell',
      'rare',
      5,
      'https://ghcctymglxgaxysdfvqi.supabase.co/storage/v1/object/public/photos/2026-08-30_17-06-06_8752.png'
    ),
    (
      'Elowen Verdant',
      'legendary',
      1,
      'https://ghcctymglxgaxysdfvqi.supabase.co/storage/v1/object/public/photos/2026-08-30_17-08-59_7443.png'
    )
) as seed(name, rarity, rarity_weight, image_url)
where not exists (
  select 1
  from public."Characters" existing
  where existing.name = seed.name
);
