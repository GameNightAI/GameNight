/*
  # Account deletion RPC

  Allows authenticated users to permanently delete their own account and
  associated personal data. Runs as SECURITY DEFINER so it can remove
  the auth.users row after clearing public schema data.
*/

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Participation on others' polls/events
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'votes_events'
  ) THEN
    DELETE FROM public.votes_events WHERE user_id = uid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'poll_comments'
  ) THEN
    DELETE FROM public.poll_comments WHERE user_id = uid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'votes' AND column_name = 'user_id'
  ) THEN
    DELETE FROM public.votes WHERE user_id = uid;
  END IF;

  -- Owned content (polls cascade to poll_games, poll_dates, votes, etc.)
  DELETE FROM public.collections WHERE user_id = uid;
  DELETE FROM public.polls WHERE user_id = uid;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    DELETE FROM public.profiles WHERE id = uid;
  END IF;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
