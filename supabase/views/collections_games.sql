drop view collections_games;

create view collections_games with (security_invoker = on) as
  select
    collections.id,
    collections.user_id,
    collections.bgg_game_id,
    games.name,
    games.year_published,
    games.is_expansion,
    games.rank,
    games.playing_time,
    games.minplaytime,
    games.maxplaytime,
    games.min_players,
    games.max_players,
    games.complexity,
    games.description,
    games.is_cooperative,
    games.is_teambased,
    games.best_players,
    games.rec_players,
    games.min_age,
    games.suggested_playerage,
    games.bayesaverage,
    games.average,
    games.image_url as thumbnail,
    collections.created_at,
    complexity_view.id as complexity_tier,
    complexity_view.description as complexity_desc
  from
    collections
    left join games on collections.bgg_game_id = games.id
    left join complexity_view on
      complexity_view.min_complexity < games.complexity 
      and games.complexity <= complexity_view.max_complexity