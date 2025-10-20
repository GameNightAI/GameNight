create or replace view poll_comments_view with (security_invoker = on) as
  select
    poll_comments.*,
    profiles.username,
    profiles.firstname,
    profiles.lastname
  from
    poll_comments
    left join profiles on poll_comments.user_id = profiles.id