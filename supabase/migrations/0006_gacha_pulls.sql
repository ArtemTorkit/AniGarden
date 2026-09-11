-- Records individual pulls and provides an atomic gem spend operation.
create table if not exists public.gacha_pulls (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  banner_id    uuid not null references public.gacha_banners(id),
  character_id uuid not null references public."Characters"(id),
  created_at   timestamptz not null default now()
);

create index if not exists gacha_pulls_user_id_idx on public.gacha_pulls(user_id);

alter table public.gacha_pulls enable row level security;

drop policy if exists "gacha_pulls_select_own" on public.gacha_pulls;
create policy "gacha_pulls_select_own"
  on public.gacha_pulls for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.spend_gems(p_user_id uuid, p_amount int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance int;
begin
  if p_amount <= 0 then
    raise exception 'Gem spend must be positive';
  end if;

  -- Serialize spends for one user so two simultaneous pulls cannot overspend.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select coalesce(sum(amount), 0)::int
    into current_balance
    from public.gem_transactions
   where user_id = p_user_id and status = 'completed';

  if current_balance < p_amount then
    return false;
  end if;

  insert into public.gem_transactions (user_id, amount, kind, status)
  values (p_user_id, -p_amount, 'pull_spend', 'completed');

  return true;
end;
$$;

revoke all on function public.spend_gems(uuid, int) from public, anon, authenticated;
grant execute on function public.spend_gems(uuid, int) to service_role;
