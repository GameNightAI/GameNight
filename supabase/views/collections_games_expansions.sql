drop view collections_games_expansions;

create or replace view collections_games_expansions with (security_invoker = on) as
  select
    base.*,
    expansions.expansion_id,
    games.name as expansion_name,
    games.min_players as expansion_min_players,
    games.max_players as expansion_max_players,
    coalesce(exp.is_expansion, false) as is_expansion_owned,
    games.thumbnail as expansion_thumbnail
  from
    collections_games as base
    left join expansions
      on base.bgg_game_id = expansions.base_id
    left join collections_games as exp
      on expansions.expansion_id = exp.bgg_game_id
      and base.user_id = exp.user_id
    left join games
      on expansions.expansion_id = games.id
  where
    base.is_expansion = false
    and (
      exp.is_expansion = true /* is_expansion_owned */
      /* Show all unowned expansions, as long as they're not promos or fan expansions. */
      or not (
        coalesce(games.boardgamefamily, '') like '%Promotional:%'
        or coalesce(games.boardgamecategory, '') like '%Fan Expansion%'
      )
    )