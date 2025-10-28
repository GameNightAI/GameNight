create or replace function truncate_expansions_staging()
returns void
language plpgsql
security invoker set search_path = ''
set statement_timeout to '20s'
as $$
begin

truncate table public.expansions_staging;

end;
$$