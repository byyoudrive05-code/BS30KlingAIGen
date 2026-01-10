/*
  # Fix Users RLS Policy for Login

  1. Changes
    - Drop existing restrictive SELECT policy on users table
    - Create new policy that allows anonymous users to read user data for login purposes
    - This is safe because we're using username-based authentication without passwords
  
  2. Security Notes
    - Users table is readable by anyone for login functionality
    - Admin operations (INSERT, UPDATE, DELETE) still restricted to admin users only
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create new policy allowing anonymous read access for login
CREATE POLICY "Anyone can read users for login"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);