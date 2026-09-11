-- Avoid ON CONFLICT(offer_id, ...) colliding with the function's output
-- parameter named offer_id.
create or replace function public.create_trade_offer(p_user_id uuid, p_inventory_ids uuid[], p_requested_character_ids uuid[])
returns table (offer_id uuid, share_token text)
language plpgsql security definer set search_path = public
as $$
declare
  new_offer public.trade_offers;
  item_id uuid;
  requested_id uuid;
begin
  if coalesce(array_length(p_inventory_ids, 1), 0) < 1 or array_length(p_inventory_ids, 1) > 10 then raise exception 'Choose between 1 and 10 characters to offer'; end if;
  if coalesce(array_length(p_requested_character_ids, 1), 0) < 1 or array_length(p_requested_character_ids, 1) > 10 then raise exception 'Choose between 1 and 10 characters you want'; end if;
  if (select count(*) from unnest(p_inventory_ids)) <> (select count(distinct item) from unnest(p_inventory_ids) item) then raise exception 'Duplicate offered inventory item'; end if;
  if (select count(*) from public."Characters" where id = any(p_requested_character_ids)) <> (select count(distinct item) from unnest(p_requested_character_ids) item) then raise exception 'Requested character does not exist'; end if;
  if exists (select 1 from public.trade_offer_items reserved_item join public.trade_offers pending_offer on pending_offer.id = reserved_item.offer_id where reserved_item.inventory_id = any(p_inventory_ids) and reserved_item.side = 'creator' and pending_offer.status = 'pending') then raise exception 'One of these characters is already in a pending trade. Open /trades to cancel the existing offer.'; end if;
  if (select count(*) from public."User_Inventory" where id = any(p_inventory_ids) and user_id = p_user_id) <> array_length(p_inventory_ids, 1) then raise exception 'You can only trade characters you own'; end if;
  insert into public.trade_offers (creator_user_id) values (p_user_id) returning * into new_offer;
  foreach item_id in array p_inventory_ids loop
    insert into public.trade_offer_items (offer_id, inventory_id, side) values (new_offer.id, item_id, 'creator');
  end loop;
  foreach requested_id in array p_requested_character_ids loop
    update public.trade_offer_requested_characters requested
    set quantity = requested.quantity + 1
    where requested.offer_id = new_offer.id and requested.character_id = requested_id;
    if not found then
      insert into public.trade_offer_requested_characters (offer_id, character_id, quantity)
      values (new_offer.id, requested_id, 1);
    end if;
  end loop;
  return query select new_offer.id, new_offer.share_token;
end;
$$;
