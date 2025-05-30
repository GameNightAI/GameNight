/*
  # Add upsert policy for collections table

  1. Changes
    - Add new RLS policy to allow authenticated users to update their own records
    
  2. Security
    - Policy ensures users can only update their own collection entries
    - Maintains data isolation between users
*/

CREATE POLICY "Users can update own collections"
  ON collections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);