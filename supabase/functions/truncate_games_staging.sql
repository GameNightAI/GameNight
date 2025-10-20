create or replace function truncate_games_staging()
returns void
language plpgsql
security invoker set search_path = ''
set statement_timeout to '60s'
as $$
begin

truncate table public.games_staging;

end;
$$