-- Stores Garden Value so profile pages do not recalculate it in the browser.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  garden_value bigint not null default 0 check (garden_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own" on public.user_profiles for select to authenticated using (auth.uid() = user_id);

create or replace function public.recalculate_garden_value(p_user_id uuid)
returns bigint language plpgsql security definer set search_path = public
as $$
declare calculated_value bigint;
begin
  select coalesce(sum(
    case lower(character.rarity) when 'common' then 100 when 'uncommon' then 250 when 'rare' then 750 when 'epic' then 1500 when 'legendary' then 3000 else 0 end
    * case inventory.blooming_rate when 1 then 1.0 when 2 then 1.25 when 3 then 1.5 when 4 then 2.0 when 5 then 3.0 else 1.0 end
  )::bigint, 0)
  into calculated_value
  from public."User_Inventory" inventory
  join public."Characters" character on character.id = inventory.character_id
  where inventory.user_id = p_user_id;

  insert into public.user_profiles (user_id, garden_value, updated_at) values (p_user_id, calculated_value, now())
  on conflict (user_id) do update set garden_value = excluded.garden_value, updated_at = now();
  return calculated_value;
end;
$$;

create or replace function public.sync_garden_value_after_inventory_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then perform public.recalculate_garden_value(old.user_id);
  elsif tg_op = 'UPDATE' then
    perform public.recalculate_garden_value(old.user_id);
    if new.user_id is distinct from old.user_id then perform public.recalculate_garden_value(new.user_id); end if;
  else perform public.recalculate_garden_value(new.user_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_garden_value_on_inventory_change on public."User_Inventory";
create trigger sync_garden_value_on_inventory_change after insert or update or delete on public."User_Inventory"
for each row execute function public.sync_garden_value_after_inventory_change();

insert into public.user_profiles (user_id, garden_value)
select users.id, coalesce(sum(
  case lower(character.rarity) when 'common' then 100 when 'uncommon' then 250 when 'rare' then 750 when 'epic' then 1500 when 'legendary' then 3000 else 0 end
  * case inventory.blooming_rate when 1 then 1.0 when 2 then 1.25 when 3 then 1.5 when 4 then 2.0 when 5 then 3.0 else 1.0 end
)::bigint, 0)
from auth.users users
left join public."User_Inventory" inventory on inventory.user_id = users.id
left join public."Characters" character on character.id = inventory.character_id
group by users.id
on conflict (user_id) do update set garden_value = excluded.garden_value, updated_at = now();

revoke all on function public.recalculate_garden_value(uuid) from public, anon, authenticated;
grant execute on function public.recalculate_garden_value(uuid) to service_role;
