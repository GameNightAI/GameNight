/*
  # Add game attributes for filtering

  1. New Columns
    - `min_age` (smallint) - Minimum recommended age for the game
    - `is_cooperative` (boolean) - Whether the game is cooperative
    - `complexity` (real) - Game complexity rating (1-5 scale)

  2. Changes
    - Add new columns to games table
    - Add default values for better data consistency
*/

-- Add new columns to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS min_age smallint,
ADD COLUMN IF NOT EXISTS is_cooperative boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS complexity real;

-- Add comment explaining complexity scale
COMMENT ON COLUMN games.complexity IS 'Game complexity rating on a 1-5 scale: <1 Light, 1-2 Medium Light, 2-3 Medium, 3-4 Medium Heavy, >4 Heavy';