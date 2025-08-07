/*
  # Add poll editing policies

  1. Changes
    - Add DELETE policy for poll_games to allow poll creators to remove games
    - Add DELETE policy for votes to allow poll creators to remove votes when games are removed
    
  2. Security
    - Policies ensure users can only modify polls they created
    - Maintains data isolation between users
*/

-- Add DELETE policy for poll_games
CREATE POLICY "Users can remove games from their polls"
  ON poll_games
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM polls
    WHERE polls.id = poll_games.poll_id
    AND polls.user_id = auth.uid()
  ));

-- Add DELETE policy for votes (when games are removed from polls)
CREATE POLICY "Poll creators can delete votes"
  ON votes
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM polls
    WHERE polls.id = votes.poll_id
    AND polls.user_id = auth.uid()
  ));
