drop view collections_games;

create view collections_games as
  select
    collections.id,
    collections.user_id,
    collections.bgg_game_id,
    collections.created_at,
    games.name,
    games.year_published,
    games.bayesaverage,
    games.average,
    games.is_expansion,
    games.rank,
    games.playing_time,
    games.minplaytime,
    games.maxplaytime,
    games.min_players,
    games.max_players,
    games.image_url as thumbnail,
    games.complexity,
    games.description,
    games.is_cooperative,
    games.is_teambased,
    games.best_players,
    games.rec_players,
    games.min_age,
    games.suggested_playerage
  from
    collections
    left join games on collections.bgg_game_id = games.id
