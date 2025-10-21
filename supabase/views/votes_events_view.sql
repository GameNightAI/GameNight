create or replace view votes_events_view with (security_invoker = on) as
  select
    votes_events.*,
    profiles.username,
    profiles.firstname,
    profiles.lastname
  from
    votes_events
    left join profiles on votes_events.user_id = profiles.id