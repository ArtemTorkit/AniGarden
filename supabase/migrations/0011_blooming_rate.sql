-- Stores an independent per-pull Blooming Rate. Legacy pulls start at rate 1.
alter table public."User_Inventory"
  add column if not exists blooming_rate smallint not null default 1;

alter table public."User_Inventory"
  drop constraint if exists user_inventory_blooming_rate_check;
alter table public."User_Inventory"
  add constraint user_inventory_blooming_rate_check check (blooming_rate between 1 and 5);

alter table public.gacha_pulls
  add column if not exists blooming_rate smallint not null default 1;

alter table public.gacha_pulls
  drop constraint if exists gacha_pulls_blooming_rate_check;
alter table public.gacha_pulls
  add constraint gacha_pulls_blooming_rate_check check (blooming_rate between 1 and 5);
