-- MVP economy: $1 = 15 gems, paid pulls cost 3 gems, and owned cards can be sold.
-- Launch promotion doubles the total reward through 2026-10-12 UTC.

alter table public.gem_transactions
  drop constraint if exists gem_transactions_kind_check;

alter table public.gem_transactions
  add constraint gem_transactions_kind_check
  check (kind in ('purchase', 'pull_spend', 'refund', 'sell'));

update public.gacha_banners
set cost_gems = 3
where is_active = true and daily_free = false;

create or replace function public.process_buymeacoffee_event(
  p_event_id text,
  p_event_type text,
  p_live_mode boolean,
  p_payment_id text,
  p_claim_code text,
  p_amount numeric,
  p_currency text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  intent public.gem_purchase_intents%rowtype;
  result_code text;
  payment_cents int;
  calculated_gems int;
begin
  insert into public.buymeacoffee_webhook_events
    (event_id, event_type, live_mode, payload)
  values
    (p_event_id, p_event_type, coalesce(p_live_mode, true), p_payload);

  if not coalesce(p_live_mode, true) then
    result_code := 'ignored_test';
  elsif p_event_type = 'donation.created' then
    if p_payment_id is null or p_amount is null or upper(coalesce(p_currency, '')) <> 'USD' then
      result_code := 'rejected_payment';
    else
      payment_cents := round(p_amount * 100)::int;
      calculated_gems := floor((payment_cents * 15) / 100)::int
        + case
            when payment_cents >= 1500 then 50
            when payment_cents >= 1000 then 25
            else 0
          end;
      if now() <= timestamptz '2026-10-12 23:59:59.999+00' then
        calculated_gems := calculated_gems * 2;
      end if;

      select * into intent
      from public.gem_purchase_intents
      where claim_code = upper(trim(coalesce(p_claim_code, '')))
        and status = 'pending'
      for update;

      if not found then
        result_code := 'unmatched_claim_code';
      elsif payment_cents < 400
        or abs(intent.expected_amount - (payment_cents / 100.0)) > 0.009 then
        update public.gem_purchase_intents
        set status = 'rejected'
        where id = intent.id;
        result_code := case when payment_cents < 400 then 'amount_too_low' else 'amount_mismatch' end;
      else
        insert into public.gem_transactions
          (user_id, amount, kind, status, payment_provider, external_payment_id)
        values
          (intent.user_id, calculated_gems, 'purchase', 'completed', 'buymeacoffee', 'bmc:' || p_payment_id);

        update public.gem_purchase_intents
        set status = 'credited', gem_amount = calculated_gems,
            provider_payment_id = p_payment_id, credited_at = now()
        where id = intent.id;
        result_code := 'credited';
      end if;
    end if;
  elsif p_event_type = 'donation.refunded' then
    select * into intent
    from public.gem_purchase_intents
    where provider_payment_id = p_payment_id and status = 'credited'
    for update;

    if not found then
      result_code := 'unmatched_refund';
    else
      insert into public.gem_transactions
        (user_id, amount, kind, status, payment_provider, external_payment_id)
      values
        (intent.user_id, -intent.gem_amount, 'refund', 'completed', 'buymeacoffee', 'bmc:refund:' || p_payment_id);

      update public.gem_purchase_intents
      set status = 'refunded', refunded_at = now()
      where id = intent.id;
      result_code := 'refunded';
    end if;
  else
    result_code := 'ignored_event';
  end if;

  update public.buymeacoffee_webhook_events
  set processed = true, result = result_code, processed_at = now()
  where event_id = p_event_id;
  return result_code;
exception when unique_violation then
  update public.buymeacoffee_webhook_events
  set processed = true, result = 'duplicate_payment', processed_at = now()
  where event_id = p_event_id;
  return 'duplicate_payment';
end;
$$;

revoke all on function public.process_buymeacoffee_event(text, text, boolean, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.process_buymeacoffee_event(text, text, boolean, text, text, numeric, text, jsonb)
  to service_role;

create or replace function public.sell_inventory_character(
  p_user_id uuid,
  p_inventory_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inventory_row public."User_Inventory"%rowtype;
  character_rarity text;
  sell_amount int;
begin
  select * into inventory_row
  from public."User_Inventory"
  where id = p_inventory_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Character not found or not owned';
  end if;

  if exists (
    select 1
    from public.trade_offer_items item
    join public.trade_offers offer on offer.id = item.offer_id
    where item.inventory_id = p_inventory_id
      and item.side = 'creator'
      and offer.status = 'pending'
  ) then
    raise exception 'Character is reserved in a pending trade';
  end if;

  select lower(rarity) into character_rarity
  from public."Characters"
  where id = inventory_row.character_id;

  sell_amount := case character_rarity
    when 'common' then 1
    when 'rare' then 2
    when 'epic' then 5
    when 'legendary' then 12
    else 0
  end;

  if sell_amount <= 0 then
    raise exception 'Character has no sell value';
  end if;

  delete from public."User_Inventory" where id = p_inventory_id;

  insert into public.gem_transactions
    (user_id, amount, kind, status, payment_provider, external_payment_id)
  values
    (p_user_id, sell_amount, 'sell', 'completed', 'internal', 'sell:' || p_inventory_id);

  return sell_amount;
end;
$$;

revoke all on function public.sell_inventory_character(uuid, uuid) from public, anon, authenticated;
grant execute on function public.sell_inventory_character(uuid, uuid) to service_role;
