/*
  # Fix API Keys RLS Policies for Auth Integration

  1. Changes
    - Drop existing RLS policies for api_keys
    - Recreate policies using auth_id instead of id for auth checks
  
  2. Security
    - Admin users can manage all API keys (checked via auth_id)
    - Users can view their own API keys
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can insert API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can update API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;

-- Recreate policies with correct auth_id checks
CREATE POLICY "Admins can view all API keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can insert API keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update API keys"
  ON api_keys
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can delete API keys"
  ON api_keys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Users can view own API keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid() AND users.id = api_keys.user_id
    )
  );