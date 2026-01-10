/*
  # Fix API Keys User Relation

  1. Problem
    - api_keys.user_id references users.id (the app's internal user ID)
    - But "Users can view own API keys" policy uses auth.uid() = user_id
    - auth.uid() returns the Supabase Auth ID, not the app's user ID
    - This causes RLS to fail because we're comparing auth_id with app user_id
    
  2. Solution
    - Keep the user_id as reference to users.id (app user ID)
    - Fix policies to properly join users table and compare auth_id
    
  3. Changes
    - Update "Users can view own API keys" policy to properly check auth_id
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;

-- Recreate with proper auth_id check
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = api_keys.user_id
      AND users.auth_id = auth.uid()
    )
  );
