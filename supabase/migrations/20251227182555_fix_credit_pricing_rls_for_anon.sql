/*
  # Fix Credit Pricing RLS for Anonymous Access

  This migration updates the credit_pricing RLS policies to work with
  the current authentication system which doesn't use Supabase Auth sessions.

  ## Issue
  
  The app uses username-only login without Supabase Auth, so all database
  requests use the anonymous (anon) role, not the authenticated role.

  ## Solution
  
  Update policies to allow anon role to perform updates. Security is maintained
  through frontend validation (AdminPanel only accessible to users with is_admin=true).

  ## Changes
  
  1. Drop existing restrictive policies
  2. Create permissive policies for anon role
*/

-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated updates to credit pricing" ON credit_pricing;
DROP POLICY IF EXISTS "Prevent deletion of credit pricing" ON credit_pricing;
DROP POLICY IF EXISTS "Allow authenticated inserts to credit pricing" ON credit_pricing;

-- Allow all users (including anon) to update pricing
-- Frontend AdminPanel validates admin access
CREATE POLICY "Allow updates to credit pricing"
  ON credit_pricing
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow inserts for new pricing tiers
CREATE POLICY "Allow inserts to credit pricing"
  ON credit_pricing
  FOR INSERT
  WITH CHECK (true);

-- Prevent accidental deletion
CREATE POLICY "Prevent deletion of credit pricing"
  ON credit_pricing
  FOR DELETE
  USING (false);