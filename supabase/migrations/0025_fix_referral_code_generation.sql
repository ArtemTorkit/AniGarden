-- Avoid extension-schema lookup issues when generating referral codes.
-- gen_random_uuid() is already used throughout the schema and is available
-- under the function's restricted public search path.
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
    generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    begin
      insert into public.referral_codes (user_id, code) values (p_user_id, generated_code);
      return generated_code;
    exception when unique_violation then
      select code into existing_code from public.referral_codes where user_id = p_user_id;
      if found then return existing_code; end if;
    end;
  end loop;
end;
$$;

revoke all on function public.get_or_create_referral_code(uuid) from public, anon, authenticated;
grant execute on function public.get_or_create_referral_code(uuid) to service_role;
