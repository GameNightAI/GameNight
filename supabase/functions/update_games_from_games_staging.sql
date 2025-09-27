begin

delete from public.games
  where id is not null;

insert into public.games
  select * from public.games_staging;
  
end