-- Assign legacy inventory cards stable edition numbers, oldest first.
with numbered as (
  select
    legacy.id,
    coalesce(existing.last_number, 0) + row_number() over (partition by legacy.character_id order by legacy.acquired_at asc, legacy.id asc) as edition
  from public."User_Inventory" legacy
  left join (
    select character_id, max(edition_number) as last_number
    from public."User_Inventory"
    where edition_number is not null
    group by character_id
  ) existing on existing.character_id = legacy.character_id
  where legacy.edition_number is null
)
update public."User_Inventory" inventory
set edition_number = numbered.edition
from numbered
where inventory.id = numbered.id;

insert into public.character_edition_counters (character_id, last_number)
select character_id, max(edition_number)
from public."User_Inventory"
where edition_number is not null
group by character_id
on conflict (character_id) do update
set last_number = greatest(public.character_edition_counters.last_number, excluded.last_number);
