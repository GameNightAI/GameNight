select 
  created_at as login_timestamp,
  payload -> 'actor_username' as username
from auth.audit_log_entries
where
  payload ->> 'action' = 'login'
  and payload ->> 'actor_username' not in (
    'bsomok@gmail.com',
    'bsomok2@gmail.com',
    'joshacain@gmail.com',
    'kevin.wand@gmail.com',
    'gamenightaidev@gmail.com',
    'gamenyteapp@gmail.com',
    'klackapp@gmail.com',
    'hortesque@gmail.com'
  )
order by created_at desc