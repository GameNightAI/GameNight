create or replace function insert_game_into_collection(
  game_id int4
)
returns void
language plpgsql
security invoker set search_path = ''
as $$
begin

insert into public.collections
  select
    gen_random_uuid() as id,
    cast(auth.uid() as uuid) as user_id,
    games.id as bgg_game_id,
    now() as created_at,
    games.name,
    games.thumbnail,
    games.min_players,
    games.max_players,
    games.playing_time,
    games.year_published,
    games.minplaytime,
    games.maxplaytime,
    '' as description
  from public.games as games
  where insert_game_into_collection.game_id = games.id;

end;
$$