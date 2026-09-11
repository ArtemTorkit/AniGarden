-- Keeps the edition number alongside the pull record for profile history.
alter table public.gacha_pulls
  add column if not exists edition_number bigint;
