/*
  # Set default role for users table

  ## Changes
  1. Update all NULL roles to 'user'
  2. Set default value for role column to 'user'
  3. Add NOT NULL constraint to role column
  
  ## Notes
  - Ensures all users have a valid role
  - Prevents pricing query failures due to NULL role
*/

-- Step 1: Update existing NULL roles
UPDATE users 
SET role = 'user' 
WHERE role IS NULL OR role = '';

-- Step 2: Set default value for role column
ALTER TABLE users 
ALTER COLUMN role SET DEFAULT 'user';

-- Step 3: Add NOT NULL constraint
ALTER TABLE users
ALTER COLUMN role SET NOT NULL;

-- Step 4: Add check constraint for valid roles
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('user', 'premium', 'admin'));
