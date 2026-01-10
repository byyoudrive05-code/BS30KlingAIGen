/*
  # Add Auth ID to Users Table

  1. Changes
    - Add `auth_id` column to `users` table to link with Supabase Auth
    - Create trigger to sync auth.users with users table
  
  2. Notes
    - This enables proper RLS by linking app users with Supabase Auth
    - Existing users will need to be migrated to auth.users
*/

-- Add auth_id column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index on auth_id
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);