-- Function not in use. For auth purposes if we decide to enable username login.

-- RPC function to get email from username

-- This function looks up a user's email address using their username
-- Returns the email if username exists, null if not found

CREATE OR REPLACE FUNCTION get_email_from_username(username_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email text;
BEGIN
  -- Look up the email for the given username
  SELECT u.email INTO user_email
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.username = username_param;
  
  -- Return the email (will be null if username not found)
  RETURN user_email;
END;
$$;
