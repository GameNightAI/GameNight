begin

delete from public.expansions
  where id is not null;

insert into public.expansions
  select * from public.expansions_staging;
  
end