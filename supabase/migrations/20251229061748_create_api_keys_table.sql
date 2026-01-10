/*
  # Create API Keys Table

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `api_key` (text, unique) - The actual API key string
      - `provider` (text) - Provider name (e.g., "openai")
      - `credits` (numeric) - Available credits for this API key
      - `is_active` (boolean) - Whether this API key is active
      - `created_at` (timestamptz) - When the API key was added
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `api_keys` table
    - Add policies for authenticated users to read their own API keys
    - Add policies for admin users to manage all API keys

  3. Notes
    - Users can have multiple API keys
    - Total user credits = sum of all active API keys' credits
    - When generating, system will automatically use API key with available credits
    - If one API key runs out, system falls back to another active API key
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  credits numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own API keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all API keys
CREATE POLICY "Admins can view all API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policy: Admins can insert API keys
CREATE POLICY "Admins can insert API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policy: Admins can update API keys
CREATE POLICY "Admins can update API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policy: Admins can delete API keys
CREATE POLICY "Admins can delete API keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS api_keys_updated_at ON api_keys;
CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();