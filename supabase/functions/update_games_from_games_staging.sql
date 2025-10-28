create or replace function update_games_from_games_staging()
returns void
language plpgsql
security invoker set search_path = ''
set statement_timeout to '120s'
as $$
begin

truncate table public.games;

insert into public.games
  select * from public.games_staging;
  
end;
$$;