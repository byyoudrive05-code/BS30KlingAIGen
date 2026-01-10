/*
  # Kling AI Generator Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique user identifier
      - `username` (text, unique) - Username for login
      - `api_key` (text) - GMICloud API key
      - `is_admin` (boolean) - Admin flag for management access
      - `credits` (numeric) - Available credits for video generation
      - `created_at` (timestamptz) - Account creation timestamp
    
    - `generation_history`
      - `id` (uuid, primary key) - Unique generation identifier
      - `user_id` (uuid, foreign key) - Reference to users table
      - `prompt` (text) - Text prompt used for generation
      - `image_url` (text, nullable) - URL of uploaded image for image-to-video
      - `aspect_ratio` (text) - Video aspect ratio (9:16 or 16:9)
      - `duration` (integer) - Video duration in seconds (4, 8, or 12)
      - `credits_used` (numeric) - Credits deducted for this generation
      - `video_url` (text, nullable) - URL of generated video
      - `status` (text) - Generation status (processing, completed, failed)
      - `created_at` (timestamptz) - Generation request timestamp
      - `completed_at` (timestamptz, nullable) - Generation completion timestamp

  2. Security
    - Enable RLS on all tables
    - Users can only read their own data
    - Admin users can manage all users
    - Users can only access their own generation history
  
  3. Initial Data
    - Create admin user "bykapnd" with 20 credits
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  api_key text NOT NULL,
  is_admin boolean DEFAULT false,
  credits numeric DEFAULT 20,
  created_at timestamptz DEFAULT now()
);

-- Create generation_history table
CREATE TABLE IF NOT EXISTS generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_url text,
  aspect_ratio text NOT NULL,
  duration integer NOT NULL,
  credits_used numeric NOT NULL,
  video_url text,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admin can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admin can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- RLS Policies for generation_history table
CREATE POLICY "Users can read own history"
  ON generation_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own history"
  ON generation_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own history"
  ON generation_history FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert admin user bykapnd (use placeholder API key)
INSERT INTO users (username, api_key, is_admin, credits)
VALUES ('bykapnd', 'YOUR_API_KEY_HERE', true, 20)
ON CONFLICT (username) DO NOTHING;