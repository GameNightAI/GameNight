create or replace view polls_view with (security_invoker = on) as
  select
    polls.*,
    coalesce(game_count > 0, false) as has_games,
    coalesce(event_count > 0, false) as has_events
  from
    polls
    left join (
      select
        poll_id,
        count(*) as game_count
      from poll_games
      group by poll_id
    ) as pg on polls.id = pg.poll_id
    left join (
      select
        poll_id,
        count(*) as event_count
      from poll_events
      group by poll_id
    ) as pe on polls.id = pe.poll_id