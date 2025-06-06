/*
  # Add delete policy for polls

  1. Changes
    - Add new RLS policy to allow users to delete their own polls
    
  2. Security
    - Policy ensures users can only delete polls they created
    - Maintains data isolation between users
*/

CREATE POLICY "Users can delete their own polls"
  ON polls
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);