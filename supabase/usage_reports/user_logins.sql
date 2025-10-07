select 
  created_at as login_timestamp,
  payload -> 'actor_username' as username
from auth.audit_log_entries
where
  payload ->> 'action' = 'login'
  and payload ->> 'actor_username' not in (
    'fakename@gmail.com'
  )
order by created_at desc