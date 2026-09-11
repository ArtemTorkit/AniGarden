-- Gives every pulled character a globally unique edition number per character.
alter table public."User_Inventory"
  add column if not exists edition_number bigint;

create unique index if not exists user_inventory_character_edition_idx
  on public."User_Inventory"(character_id, edition_number)
  where edition_number is not null;

create table if not exists public.character_edition_counters (
  character_id uuid primary key references public."Characters"(id) on delete cascade,
  last_number bigint not null default 0
);

insert into public.character_edition_counters (character_id, last_number)
select character_id, coalesce(max(edition_number), 0)
from public."User_Inventory"
where edition_number is not null
group by character_id
on conflict (character_id) do update
set last_number = greatest(public.character_edition_counters.last_number, excluded.last_number);

create or replace function public.next_character_edition(p_character_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
begin
  insert into public.character_edition_counters (character_id, last_number)
  values (p_character_id, 1)
  on conflict (character_id) do update
    set last_number = character_edition_counters.last_number + 1
  returning last_number into next_number;
  return next_number;
end;
$$;

revoke all on function public.next_character_edition(uuid) from public, anon, authenticated;
grant execute on function public.next_character_edition(uuid) to service_role;
