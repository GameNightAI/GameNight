create or replace view expansions_players_view with (security_invoker = on) as
  select
    collections_games.*,
    e.min_exp_players,
    e.max_exp_players
  from 
    collections_games
    left join (
      select
        base.user_id,
        base.bgg_game_id,
        min(exp.min_players) as min_exp_players,
        max(exp.max_players) as max_exp_players
      from
        collections_games as base
        join expansions on base.bgg_game_id = expansions.base_id
        join collections_games as exp
          on expansions.expansion_id = exp.bgg_game_id
          and base.user_id = exp.user_id
      group by base.user_id, base.bgg_game_id
    ) as e
      on collections_games.user_id = e.user_id
      and collections_games.bgg_game_id = e.bgg_game_id
  where collections_games.is_expansion = false