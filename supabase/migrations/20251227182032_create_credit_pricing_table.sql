/*
  # Create Credit Pricing Configuration Table

  1. New Tables
    - `credit_pricing`
      - `id` (uuid, primary key) - Unique identifier
      - `duration` (integer, unique) - Video duration in seconds (4, 8, or 12)
      - `price` (numeric) - Credit cost for this duration
      - `created_at` (timestamp) - When the pricing was created
      - `updated_at` (timestamp) - When the pricing was last updated

  2. Security
    - Enable RLS on `credit_pricing` table
    - Add policy for all users to read pricing (public read access)
    - Add policy for admin users only to insert/update/delete pricing

  3. Initial Data
    - Insert default pricing for 4, 8, and 12 second durations
*/

CREATE TABLE IF NOT EXISTS credit_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration integer UNIQUE NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE credit_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read credit pricing"
  ON credit_pricing
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert credit pricing"
  ON credit_pricing
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Only admins can update credit pricing"
  ON credit_pricing
  FOR UPDATE
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

CREATE POLICY "Only admins can delete credit pricing"
  ON credit_pricing
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

INSERT INTO credit_pricing (duration, price) VALUES
  (4, 0.4),
  (8, 0.8),
  (12, 1.2)
ON CONFLICT (duration) DO NOTHING;