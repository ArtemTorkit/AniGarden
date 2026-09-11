-- Qualify offer_id references inside the acceptance function to avoid the
-- PL/pgSQL variable `offer` colliding with table column names.
create or replace function public.accept_trade_offer(p_user_id uuid, p_share_token text, p_inventory_ids uuid[])
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  current_offer public.trade_offers;
  item_id uuid;
begin
  select trade.* into current_offer
  from public.trade_offers trade
  where trade.share_token = p_share_token and trade.status = 'pending'
  for update;
  if not found then raise exception 'Trade offer is no longer available'; end if;
  if current_offer.creator_user_id = p_user_id then raise exception 'You cannot accept your own trade'; end if;
  if coalesce(array_length(p_inventory_ids, 1), 0) <> (select coalesce(sum(requested.quantity), 0) from public.trade_offer_requested_characters requested where requested.offer_id = current_offer.id) then raise exception 'Choose exactly the requested characters'; end if;
  if (select count(*) from unnest(p_inventory_ids)) <> (select count(distinct item) from unnest(p_inventory_ids) item) then raise exception 'Duplicate inventory item'; end if;
  if (select count(*) from public."User_Inventory" inventory where inventory.id = any(p_inventory_ids) and inventory.user_id = p_user_id) <> array_length(p_inventory_ids, 1) then raise exception 'You can only trade characters you own'; end if;
  if exists (select 1 from public.trade_offer_requested_characters requested where requested.offer_id = current_offer.id and (select count(*) from public."User_Inventory" inventory where inventory.id = any(p_inventory_ids) and inventory.user_id = p_user_id and inventory.character_id = requested.character_id) <> requested.quantity) then raise exception 'You must provide the requested quantities'; end if;
  if exists (select 1 from public."User_Inventory" inventory where inventory.id = any(p_inventory_ids) and not exists (select 1 from public.trade_offer_requested_characters requested where requested.offer_id = current_offer.id and requested.character_id = inventory.character_id)) then raise exception 'You must provide the requested characters'; end if;
  if exists (select 1 from public.trade_offer_items reserved_item join public.trade_offers pending_offer on pending_offer.id = reserved_item.offer_id where reserved_item.inventory_id = any(p_inventory_ids) and reserved_item.side = 'creator' and pending_offer.status = 'pending') then raise exception 'One of these characters is already in a pending trade'; end if;
  foreach item_id in array p_inventory_ids loop insert into public.trade_offer_items (offer_id, inventory_id, side) values (current_offer.id, item_id, 'accepter'); end loop;
  update public."User_Inventory" set user_id = p_user_id where id in (select reserved_item.inventory_id from public.trade_offer_items reserved_item where reserved_item.offer_id = current_offer.id and reserved_item.side = 'creator');
  update public."User_Inventory" set user_id = current_offer.creator_user_id where id = any(p_inventory_ids);
  update public.trade_offers set accepter_user_id = p_user_id, status = 'completed', completed_at = now() where id = current_offer.id;
  return true;
end;
$$;
