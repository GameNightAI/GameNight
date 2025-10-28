create or replace view votes_view with (security_invoker = on) as
  select
    votes.*,
    profiles.username,
    profiles.firstname,
    profiles.lastname
  from
    votes
    left join profiles on votes.user_id = profiles.id