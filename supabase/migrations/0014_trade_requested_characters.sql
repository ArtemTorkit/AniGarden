-- Add exact character requests to peer-to-peer trade offers.
create table if not exists public.trade_offer_requested_characters (
  offer_id uuid not null references public.trade_offers(id) on delete cascade,
  character_id uuid not null references public."Characters"(id) on delete cascade,
  primary key (offer_id, character_id)
);

create index if not exists trade_offer_requested_characters_offer_idx
  on public.trade_offer_requested_characters(offer_id);

alter table public.trade_offer_requested_characters enable row level security;
drop policy if exists "trade_offer_requested_characters_select_visible" on public.trade_offer_requested_characters;
create policy "trade_offer_requested_characters_select_visible"
  on public.trade_offer_requested_characters for select to authenticated
  using (exists (select 1 from public.trade_offers offer where offer.id = offer_id and (offer.status = 'pending' or offer.creator_user_id = auth.uid() or offer.accepter_user_id = auth.uid())));

create or replace function public.create_trade_offer(p_user_id uuid, p_inventory_ids uuid[], p_requested_character_ids uuid[])
returns table (offer_id uuid, share_token text)
language plpgsql security definer set search_path = public
as $$
declare
  new_offer public.trade_offers;
  item_id uuid;
  character_id uuid;
begin
  if coalesce(array_length(p_inventory_ids, 1), 0) < 1 or array_length(p_inventory_ids, 1) > 10 then raise exception 'Choose between 1 and 10 characters to offer'; end if;
  if coalesce(array_length(p_requested_character_ids, 1), 0) < 1 or array_length(p_requested_character_ids, 1) > 10 then raise exception 'Choose between 1 and 10 characters you want'; end if;
  if (select count(*) from unnest(p_inventory_ids)) <> (select count(distinct item) from unnest(p_inventory_ids) item) then raise exception 'Duplicate offered inventory item'; end if;
  if (select count(*) from unnest(p_requested_character_ids)) <> (select count(distinct item) from unnest(p_requested_character_ids) item) then raise exception 'Duplicate requested character'; end if;
  if (select count(*) from public."Characters" where id = any(p_requested_character_ids)) <> array_length(p_requested_character_ids, 1) then raise exception 'Requested character does not exist'; end if;
  if exists (select 1 from public.trade_offer_items item join public.trade_offers offer on offer.id = item.offer_id where item.inventory_id = any(p_inventory_ids) and item.side = 'creator' and offer.status = 'pending') then raise exception 'One of these characters is already in a pending trade'; end if;
  if (select count(*) from public."User_Inventory" where id = any(p_inventory_ids) and user_id = p_user_id) <> array_length(p_inventory_ids, 1) then raise exception 'You can only trade characters you own'; end if;
  insert into public.trade_offers (creator_user_id) values (p_user_id) returning * into new_offer;
  foreach item_id in array p_inventory_ids loop insert into public.trade_offer_items (offer_id, inventory_id, side) values (new_offer.id, item_id, 'creator'); end loop;
  foreach character_id in array p_requested_character_ids loop insert into public.trade_offer_requested_characters (offer_id, character_id) values (new_offer.id, character_id); end loop;
  return query select new_offer.id, new_offer.share_token;
end;
$$;

create or replace function public.accept_trade_offer(p_user_id uuid, p_share_token text, p_inventory_ids uuid[])
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  offer public.trade_offers;
  item_id uuid;
begin
  select * into offer from public.trade_offers where share_token = p_share_token and status = 'pending' for update;
  if not found then raise exception 'Trade offer is no longer available'; end if;
  if offer.creator_user_id = p_user_id then raise exception 'You cannot accept your own trade'; end if;
  if coalesce(array_length(p_inventory_ids, 1), 0) <> (select count(*) from public.trade_offer_requested_characters where offer_id = offer.id) then raise exception 'Choose exactly the requested characters'; end if;
  if (select count(*) from unnest(p_inventory_ids)) <> (select count(distinct item) from unnest(p_inventory_ids) item) then raise exception 'Duplicate inventory item'; end if;
  if (select count(*) from public."User_Inventory" inventory where inventory.id = any(p_inventory_ids) and inventory.user_id = p_user_id and exists (select 1 from public.trade_offer_requested_characters requested where requested.offer_id = offer.id and requested.character_id = inventory.character_id)) <> array_length(p_inventory_ids, 1) then raise exception 'You must provide the requested characters'; end if;
  if (select count(distinct inventory.character_id) from public."User_Inventory" inventory where inventory.id = any(p_inventory_ids)) <> (select count(*) from public.trade_offer_requested_characters where offer_id = offer.id) then raise exception 'Choose one copy of each requested character'; end if;
  if exists (select 1 from public.trade_offer_items item join public.trade_offers pending on pending.id = item.offer_id where item.inventory_id = any(p_inventory_ids) and item.side = 'creator' and pending.status = 'pending') then raise exception 'One of these characters is already in a pending trade'; end if;
  foreach item_id in array p_inventory_ids loop insert into public.trade_offer_items (offer_id, inventory_id, side) values (offer.id, item_id, 'accepter'); end loop;
  update public."User_Inventory" set user_id = p_user_id where id in (select inventory_id from public.trade_offer_items where offer_id = offer.id and side = 'creator');
  update public."User_Inventory" set user_id = offer.creator_user_id where id = any(p_inventory_ids);
  update public.trade_offers set accepter_user_id = p_user_id, status = 'completed', completed_at = now() where id = offer.id;
  return true;
end;
$$;

revoke all on function public.create_trade_offer(uuid, uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public.accept_trade_offer(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.create_trade_offer(uuid, uuid[], uuid[]) to service_role;
grant execute on function public.accept_trade_offer(uuid, text, uuid[]) to service_role;
