-- Variable Buy Me a Coffee donations: 3 gems per USD plus threshold bonuses.
-- The webhook recalculates the award from the verified payment amount.

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
      calculated_gems := floor((payment_cents * 3) / 100)::int
        + case
            when payment_cents >= 1500 then 10
            when payment_cents >= 1000 then 5
            else 0
          end;

      select * into intent
      from public.gem_purchase_intents
      where claim_code = upper(trim(coalesce(p_claim_code, '')))
        and status = 'pending'
      for update;

      if not found then
        result_code := 'unmatched_claim_code';
      elsif payment_cents < 100
        or abs(intent.expected_amount - (payment_cents / 100.0)) > 0.009 then
        update public.gem_purchase_intents
        set status = 'rejected'
        where id = intent.id;
        result_code := case when payment_cents < 100 then 'amount_too_low' else 'amount_mismatch' end;
      else
        insert into public.gem_transactions
          (user_id, amount, kind, status, payment_provider, external_payment_id)
        values
          (intent.user_id, calculated_gems, 'purchase', 'completed', 'buymeacoffee', 'bmc:' || p_payment_id);

        update public.gem_purchase_intents
        set status = 'credited',
            gem_amount = calculated_gems,
            provider_payment_id = p_payment_id,
            credited_at = now()
        where id = intent.id;
        result_code := 'credited';
      end if;
    end if;
  elsif p_event_type = 'donation.refunded' then
    select * into intent
    from public.gem_purchase_intents
    where provider_payment_id = p_payment_id
      and status = 'credited'
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
