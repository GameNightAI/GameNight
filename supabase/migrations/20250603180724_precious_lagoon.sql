/*
  # Fix poll_games game_id type

  1. Changes
    - Modify game_id column in poll_games table from UUID to INTEGER
    - Update foreign key constraint to reference games table

  2. Security
    - Maintain existing RLS policies
*/

DO $$ BEGIN
  -- Drop the existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'poll_games_game_id_fkey'
  ) THEN
    ALTER TABLE poll_games DROP CONSTRAINT poll_games_game_id_fkey;
  END IF;

  -- Modify the game_id column type
  ALTER TABLE poll_games 
  ALTER COLUMN game_id TYPE integer USING game_id::text::integer;

  -- Add foreign key constraint to games table
  ALTER TABLE poll_games
  ADD CONSTRAINT poll_games_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id);
END $$;