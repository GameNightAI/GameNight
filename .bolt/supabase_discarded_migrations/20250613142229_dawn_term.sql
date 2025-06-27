/*
  # Create collections_games view for poll compatibility

  1. New View
    - `collections_games` view that maps collections table to expected structure
    - Provides compatibility layer for existing poll functionality

  2. Purpose
    - Allows poll system to work with existing collections data
    - Maintains backward compatibility
*/

-- Create a view that maps collections to the expected structure
CREATE OR REPLACE VIEW collections_games AS
SELECT 
  id,
  user_id,
  bgg_game_id,
  name,
  thumbnail,
  min_players,
  max_players,
  playing_time,
  minplaytime,
  maxplaytime,
  year_published,
  description,
  min_age,
  is_cooperative,
  complexity,
  created_at
FROM collections;

-- Grant access to the view
GRANT SELECT ON collections_games TO authenticated;