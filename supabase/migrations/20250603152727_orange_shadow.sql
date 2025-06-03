/*
  # Add voting system tables

  1. New Tables (if they don't exist)
    - `polls`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text, optional)
      - `created_at` (timestamp)
      - `expires_at` (timestamp, optional)
      - `max_votes` (integer, default 1)
    
    - `poll_games`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, references polls)
      - `game_id` (uuid)
      - `created_at` (timestamp)
    
    - `votes`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, references polls)
      - `game_id` (integer, references games)
      - `voter_name` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create polls table if it doesn't exist
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  max_votes integer DEFAULT 1 CHECK (max_votes > 0)
);

-- Create poll_games table if it doesn't exist
CREATE TABLE IF NOT EXISTS poll_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls ON DELETE CASCADE NOT NULL,
  game_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls ON DELETE CASCADE NOT NULL,
  game_id integer REFERENCES games ON DELETE RESTRICT NOT NULL,
  voter_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
DO $$
BEGIN
  -- Enable RLS for polls if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'polls' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS for poll_games if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'poll_games' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE poll_games ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS for votes if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'votes' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Polls policies
  DROP POLICY IF EXISTS "Anyone can read polls they have the ID for" ON polls;
  DROP POLICY IF EXISTS "Users can create their own polls" ON polls;
  DROP POLICY IF EXISTS "Users can read their own polls" ON polls;
  
  -- Poll games policies
  DROP POLICY IF EXISTS "Anyone can read poll games" ON poll_games;
  DROP POLICY IF EXISTS "Users can add games to their polls" ON poll_games;
  
  -- Votes policies
  DROP POLICY IF EXISTS "Poll creators can read votes" ON votes;
  DROP POLICY IF EXISTS "Anyone can create votes" ON votes;
END $$;

-- Create policies
CREATE POLICY "Anyone can read polls they have the ID for"
  ON polls
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own polls"
  ON polls
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own polls"
  ON polls
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read poll games"
  ON poll_games
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add games to their polls"
  ON poll_games
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM polls
    WHERE polls.id = poll_games.poll_id
    AND polls.user_id = auth.uid()
  ));

CREATE POLICY "Poll creators can read votes"
  ON votes
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM polls
    WHERE polls.id = votes.poll_id
    AND polls.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can create votes"
  ON votes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);