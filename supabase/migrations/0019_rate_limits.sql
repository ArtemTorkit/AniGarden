-- Database-backed rate limiting for serverless API routes.
create table if not exists public.rate_limit_buckets (
  bucket_key       text primary key,
  window_started_at timestamptz not null,
  request_count    int not null check (request_count >= 0)
);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bucket public.rate_limit_buckets%rowtype;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_bucket_key, 0));
  select * into current_bucket
  from public.rate_limit_buckets
  where bucket_key = p_bucket_key
  for update;

  if not found or current_bucket.window_started_at + make_interval(secs => p_window_seconds) <= now() then
    insert into public.rate_limit_buckets (bucket_key, window_started_at, request_count)
    values (p_bucket_key, now(), 1)
    on conflict (bucket_key) do update
      set window_started_at = excluded.window_started_at,
          request_count = excluded.request_count;
    return true;
  end if;

  if current_bucket.request_count >= p_limit then
    return false;
  end if;

  update public.rate_limit_buckets
  set request_count = request_count + 1
  where bucket_key = p_bucket_key;
  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;
