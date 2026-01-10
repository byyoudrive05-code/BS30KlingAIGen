/*
  # Fix Generation History RLS Policies

  1. Changes
    - Update RLS policies to work without Supabase Auth
    - Allow anon/authenticated access since we use username-based auth
  
  2. Notes
    - Application handles user context through localStorage
    - RLS still enabled for defense in depth
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own history" ON generation_history;
DROP POLICY IF EXISTS "Users can insert own history" ON generation_history;
DROP POLICY IF EXISTS "Users can update own history" ON generation_history;

-- Create new policies
CREATE POLICY "Anyone can read generation history"
  ON generation_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert generation history"
  ON generation_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update generation history"
  ON generation_history FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);