-- One successful referral per inviter and one inviter per referred user.

alter table public.gem_transactions
  drop constraint if exists gem_transactions_kind_check;

alter table public.gem_transactions
  add constraint gem_transactions_kind_check
  check (kind in ('purchase', 'pull_spend', 'refund', 'sell', 'promo', 'referral'));

create table if not exists public.referral_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  code       text not null unique check (code = upper(trim(code)) and code ~ '^[A-Z0-9]{12}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  inviter_user_id  uuid not null unique references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  constraint referrals_not_self_check check (inviter_user_id <> referred_user_id)
);

create index if not exists referrals_code_idx on public.referrals(referral_code_id);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on table public.referral_codes, public.referrals from anon, authenticated;

create or replace function public.get_or_create_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_code text;
  generated_code text;
begin
  select code into existing_code from public.referral_codes where user_id = p_user_id;
  if found then return existing_code; end if;

  loop
    generated_code := upper(encode(gen_random_bytes(6), 'hex'));
    begin
      insert into public.referral_codes (user_id, code) values (p_user_id, generated_code);
      return generated_code;
    exception when unique_violation then
      -- A concurrent request may have created this user's code; retry the lookup.
      select code into existing_code from public.referral_codes where user_id = p_user_id;
      if found then return existing_code; end if;
    end;
  end loop;
end;
$$;

create or replace function public.complete_referral(
  p_referred_user_id uuid,
  p_referral_code text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  referral_code_row public.referral_codes%rowtype;
  new_user_created_at timestamptz;
begin
  select * into referral_code_row
  from public.referral_codes
  where code = upper(trim(coalesce(p_referral_code, '')))
  for update;
  if not found then return 0; end if;

  select created_at into new_user_created_at from auth.users where id = p_referred_user_id;
  if new_user_created_at is null or new_user_created_at < now() - interval '30 minutes' then return 0; end if;
  if referral_code_row.user_id = p_referred_user_id then return 0; end if;
  if exists (select 1 from public.referrals where referred_user_id = p_referred_user_id) then return 0; end if;
  if exists (select 1 from public.referrals where inviter_user_id = referral_code_row.user_id) then return 0; end if;

  insert into public.referrals (referral_code_id, inviter_user_id, referred_user_id)
  values (referral_code_row.id, referral_code_row.user_id, p_referred_user_id);

  insert into public.gem_transactions
    (user_id, amount, kind, status, payment_provider, external_payment_id)
  values
    (referral_code_row.user_id, 15, 'referral', 'completed', 'internal', 'referral:inviter:' || referral_code_row.user_id || ':' || p_referred_user_id),
    (p_referred_user_id, 15, 'referral', 'completed', 'internal', 'referral:referred:' || referral_code_row.user_id || ':' || p_referred_user_id);

  return 15;
exception when unique_violation then
  return 0;
end;
$$;

revoke all on function public.get_or_create_referral_code(uuid) from public, anon, authenticated;
revoke all on function public.complete_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.get_or_create_referral_code(uuid) to service_role;
grant execute on function public.complete_referral(uuid, text) to service_role;
