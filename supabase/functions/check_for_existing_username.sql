create or replace function check_for_existing_username(
  new_username text
)
returns int4
language plpgsql
security invoker set search_path = ''
as $$
declare user_count int4;

begin
  select count(*)
  into user_count
  from public.profiles as profiles
  where
    lower(trim(check_for_existing_username.new_username)) = lower(profiles.username)
    and auth.uid() <> profiles.id;
  return user_count;
end;
$$