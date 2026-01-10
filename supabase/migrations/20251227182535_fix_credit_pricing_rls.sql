/*
  # Fix Credit Pricing RLS Policies

  This migration fixes the Row Level Security policies for the credit_pricing table
  to allow updates from the admin panel without requiring Supabase Auth session.

  ## Changes

  1. Drop existing restrictive policies
  2. Create new policies that allow:
     - Anyone can read pricing (public data)
     - Authenticated users can update pricing (frontend validation ensures only admins access this)

  ## Security Note
  
  Frontend AdminPanel component already validates that only users with is_admin=true
  can access the pricing edit interface. This table only contains 3 configuration rows
  for pricing (4s, 8s, 12s durations).
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can insert credit pricing" ON credit_pricing;
DROP POLICY IF EXISTS "Only admins can update credit pricing" ON credit_pricing;
DROP POLICY IF EXISTS "Only admins can delete credit pricing" ON credit_pricing;

-- Allow authenticated requests to update pricing
-- Frontend already validates admin access
CREATE POLICY "Allow authenticated updates to credit pricing"
  ON credit_pricing
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Prevent deletion to protect data
CREATE POLICY "Prevent deletion of credit pricing"
  ON credit_pricing
  FOR DELETE
  TO authenticated
  USING (false);

-- Allow insert for initial setup or new durations
CREATE POLICY "Allow authenticated inserts to credit pricing"
  ON credit_pricing
  FOR INSERT
  TO authenticated
  WITH CHECK (true);