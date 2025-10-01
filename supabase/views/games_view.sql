create or replace view games_view with (security_invoker = on) as
  select
    games.*,
    complexity_view.id as complexity_tier,
    complexity_view.description as complexity_desc
  from
    games
    left join complexity_view
      on complexity_view.min_complexity < games.complexity
      and games.complexity <= complexity_view.max_complexity