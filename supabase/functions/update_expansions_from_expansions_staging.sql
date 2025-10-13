create or replace function update_expansions_from_expansions_staging()
returns void
language plpgsql
security invoker set search_path = ''
as $$
begin

truncate table public.expansions;

insert into public.expansions
  select * from public.expansions_staging;
  
end;
$$