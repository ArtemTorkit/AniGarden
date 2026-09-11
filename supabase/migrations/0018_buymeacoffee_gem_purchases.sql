-- Buy Me a Coffee purchase intents and webhook ledger.
-- A user receives a one-time claim code to include in the BMC support note.
create table if not exists public.gem_purchase_intents (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  claim_code            text not null unique,
  package_id            text not null,
  expected_amount       numeric(10, 2) not null check (expected_amount > 0),
  gem_amount            int not null check (gem_amount > 0),
  provider_payment_id   text unique,
  status                text not null default 'pending'
                        check (status in ('pending', 'credited', 'refunded', 'rejected')),
  created_at            timestamptz not null default now(),
  credited_at           timestamptz,
  refunded_at           timestamptz
);

create index if not exists gem_purchase_intents_user_idx
  on public.gem_purchase_intents(user_id, created_at desc);
create index if not exists gem_purchase_intents_code_status_idx
  on public.gem_purchase_intents(claim_code, status);

alter table public.gem_purchase_intents enable row level security;
drop policy if exists "gem_purchase_intents_select_own" on public.gem_purchase_intents;
create policy "gem_purchase_intents_select_own"
  on public.gem_purchase_intents for select to authenticated
  using (auth.uid() = user_id);

alter table public.gem_transactions
  add column if not exists payment_provider text not null default 'legacy';
alter table public.gem_transactions
  add column if not exists external_payment_id text;
create unique index if not exists gem_transactions_external_payment_idx
  on public.gem_transactions(external_payment_id)
  where external_payment_id is not null;

create table if not exists public.buymeacoffee_webhook_events (
  event_id      text primary key,
  event_type    text not null,
  live_mode     boolean not null default true,
  payload       jsonb not null,
  processed     boolean not null default false,
  result        text,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);

alter table public.buymeacoffee_webhook_events enable row level security;

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
      select * into intent
      from public.gem_purchase_intents
      where claim_code = upper(trim(coalesce(p_claim_code, '')))
        and status = 'pending'
      for update;

      if not found then
        result_code := 'unmatched_claim_code';
      elsif abs(intent.expected_amount - p_amount) > 0.009 then
        update public.gem_purchase_intents
        set status = 'rejected'
        where id = intent.id;
        result_code := 'amount_mismatch';
      else
        insert into public.gem_transactions
          (user_id, amount, kind, status, payment_provider, external_payment_id)
        values
          (intent.user_id, intent.gem_amount, 'purchase', 'completed', 'buymeacoffee', 'bmc:' || p_payment_id);

        update public.gem_purchase_intents
        set status = 'credited', provider_payment_id = p_payment_id, credited_at = now()
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
