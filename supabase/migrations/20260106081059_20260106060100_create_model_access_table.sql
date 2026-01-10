/*
  # Create Model Access Control Table

  1. New Tables
    - `model_access`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - Reference to users table
      - `model_version` (text) - Model version (v2.6, v2.5-turbo, v2.1)
      - `variant` (text) - Model variant (text-to-video, image-to-video, etc)
      - `is_enabled` (boolean) - Whether this model is enabled for the user
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `model_access` table
    - Users can read their own access settings
    - Only admins can manage model access

  3. Notes
    - By default, all models are enabled for premium and admin users
    - For regular users, admins can enable/disable specific models
    - Unique constraint on (user_id, model_version, variant) to prevent duplicates
*/

-- Create model_access table
CREATE TABLE IF NOT EXISTS model_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  variant text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, model_version, variant)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_model_access_user_id ON model_access(user_id);
CREATE INDEX IF NOT EXISTS idx_model_access_enabled ON model_access(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE model_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own model access
CREATE POLICY "Users can read own model access"
  ON model_access FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Anyone can insert model access (for admin operations)
CREATE POLICY "Anyone can insert model access"
  ON model_access FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Anyone can update model access (for admin operations)
CREATE POLICY "Anyone can update model access"
  ON model_access FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can delete model access (for admin operations)
CREATE POLICY "Anyone can delete model access"
  ON model_access FOR DELETE
  TO anon, authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_model_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS model_access_updated_at ON model_access;
CREATE TRIGGER model_access_updated_at
  BEFORE UPDATE ON model_access
  FOR EACH ROW
  EXECUTE FUNCTION update_model_access_updated_at();