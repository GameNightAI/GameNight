/*
  # Create collections schema

  1. New Tables
    - `collections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `bgg_game_id` (integer)
      - `created_at` (timestamp)
      - `name` (text)
      - `thumbnail` (text)
      - `min_players` (integer)
      - `max_players` (integer)
      - `playing_time` (integer)
      - `minplaytime` (integer)
      - `maxplaytime` (integer)
      - `year_published` (integer)
      - `description` (text)

  2. Security
    - Enable RLS on `collections` table
    - Add policies for authenticated users to:
      - Read their own collections
      - Insert new games
      - Delete their own games
*/

CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  bgg_game_id integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  thumbnail text,
  min_players integer,
  max_players integer,
  playing_time integer,
  minplaytime integer,
  maxplaytime integer,
  year_published integer,
  description text,
  UNIQUE(user_id, bgg_game_id)
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own collections"
  ON collections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own collections"
  ON collections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own collections"
  ON collections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
