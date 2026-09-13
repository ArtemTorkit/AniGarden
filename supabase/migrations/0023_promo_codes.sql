-- SQL-created gem promo codes with one redemption per user and optional global limits.

alter table public.gem_transactions
  drop constraint if exists gem_transactions_kind_check;

alter table public.gem_transactions
  add constraint gem_transactions_kind_check
  check (kind in ('purchase', 'pull_spend', 'refund', 'sell', 'promo'));

create table if not exists public.promo_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  gem_amount       int not null check (gem_amount > 0),
  max_redemptions  int check (max_redemptions is null or max_redemptions > 0),
  starts_at        timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  constraint promo_codes_code_format_check check (code = upper(trim(code)) and code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  constraint promo_codes_date_order_check check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists public.promo_code_redemptions (
  id             uuid primary key default gen_random_uuid(),
  promo_code_id  uuid not null references public.promo_codes(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  gem_amount     int not null check (gem_amount > 0),
  redeemed_at    timestamptz not null default now(),
  constraint promo_code_redemptions_user_code_unique unique (promo_code_id, user_id)
);

create index if not exists promo_code_redemptions_code_idx
  on public.promo_code_redemptions(promo_code_id, redeemed_at);
create index if not exists promo_code_redemptions_user_idx
  on public.promo_code_redemptions(user_id, redeemed_at desc);

alter table public.promo_codes enable row level security;
alter table public.promo_code_redemptions enable row level security;

revoke all on table public.promo_codes, public.promo_code_redemptions from anon, authenticated;

drop policy if exists "promo_code_redemptions_select_own" on public.promo_code_redemptions;
create policy "promo_code_redemptions_select_own"
  on public.promo_code_redemptions for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.redeem_promo_code(
  p_user_id uuid,
  p_code text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  promo public.promo_codes%rowtype;
  redemption_count int;
begin
  select * into promo
  from public.promo_codes
  where code = upper(trim(coalesce(p_code, '')))
  for update;

  if not found then
    raise exception 'Promo code is invalid';
  end if;

  if promo.starts_at is not null and now() < promo.starts_at then
    raise exception 'Promo code is not active yet';
  end if;

  if promo.expires_at is not null and now() >= promo.expires_at then
    raise exception 'Promo code has expired';
  end if;

  if exists (
    select 1 from public.promo_code_redemptions
    where promo_code_id = promo.id and user_id = p_user_id
  ) then
    raise exception 'You have already redeemed this promo code';
  end if;

  if promo.max_redemptions is not null then
    select count(*)::int into redemption_count
    from public.promo_code_redemptions
    where promo_code_id = promo.id;

    if redemption_count >= promo.max_redemptions then
      raise exception 'This promo code has reached its redemption limit';
    end if;
  end if;

  insert into public.promo_code_redemptions (promo_code_id, user_id, gem_amount)
  values (promo.id, p_user_id, promo.gem_amount);

  insert into public.gem_transactions
    (user_id, amount, kind, status, payment_provider, external_payment_id)
  values
    (p_user_id, promo.gem_amount, 'promo', 'completed', 'internal', 'promo:' || promo.id || ':' || p_user_id);

  return promo.gem_amount;
exception when unique_violation then
  raise exception 'You have already redeemed this promo code';
end;
$$;

revoke all on function public.redeem_promo_code(uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_promo_code(uuid, text) to service_role;
