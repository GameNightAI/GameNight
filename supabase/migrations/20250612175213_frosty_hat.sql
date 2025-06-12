/*
  # Add poll dates table for date/time voting

  1. New Tables
    - `poll_dates`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, references polls)
      - `date_option` (timestamptz)
      - `label` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `poll_dates` table
    - Add policies for authenticated users
*/

-- Create poll_dates table
CREATE TABLE IF NOT EXISTS poll_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls ON DELETE CASCADE NOT NULL,
  date_option timestamptz NOT NULL,
  label text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE poll_dates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read poll dates"
  ON poll_dates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add dates to their polls"
  ON poll_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM polls
    WHERE polls.id = poll_dates.poll_id
    AND polls.user_id = auth.uid()
  ));

-- Update votes table to support date voting
DO $$
BEGIN
  -- Add date_id column to votes table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'votes' AND column_name = 'date_id'
  ) THEN
    ALTER TABLE votes ADD COLUMN date_id uuid REFERENCES poll_dates(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Update votes table constraints to allow either game_id or date_id (but not both null)
DO $$
BEGIN
  -- Drop the existing NOT NULL constraint on game_id
  ALTER TABLE votes ALTER COLUMN game_id DROP NOT NULL;
  
  -- Add a check constraint to ensure either game_id or date_id is provided
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'votes_game_or_date_check'
  ) THEN
    ALTER TABLE votes ADD CONSTRAINT votes_game_or_date_check 
    CHECK (
      (game_id IS NOT NULL AND date_id IS NULL) OR 
      (game_id IS NULL AND date_id IS NOT NULL) OR
      (game_id IS NOT NULL AND date_id IS NOT NULL)
    );
  END IF;
END $$;