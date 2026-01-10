/*
  # Add role-based pricing system

  ## Changes
  1. Add `role` column to `credit_pricing` table
     - Default value: 'user'
     - Allows different pricing for different user roles
  
  2. Update unique index to include role
     - Drop old index: idx_credit_pricing_unique_config
     - Create new index including role column
  
  3. Populate pricing for other roles
     - Premium role: 50% discount
     - Admin role: Free (0 credits)
  
  ## Notes
  - Admin can modify pricing for each role via admin panel
  - Different roles can have different pricing for the same model configuration
*/

-- Step 1: Add role column
ALTER TABLE credit_pricing
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Step 2: Drop old unique index
DROP INDEX IF EXISTS idx_credit_pricing_unique_config;

-- Step 3: Create new unique index including role
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_pricing_unique_config_with_role 
ON credit_pricing (model_type, model_version, variant, duration, COALESCE(audio_enabled, false), role);

-- Step 4: Add check constraint for valid roles
ALTER TABLE credit_pricing
DROP CONSTRAINT IF EXISTS credit_pricing_role_check;

ALTER TABLE credit_pricing
ADD CONSTRAINT credit_pricing_role_check 
CHECK (role IN ('user', 'premium', 'admin'));

-- Step 5: Insert pricing for 'premium' role (50% discount)
INSERT INTO credit_pricing (model_type, model_version, variant, duration, price, audio_enabled, is_per_second, role)
SELECT 
  model_type, 
  model_version, 
  variant, 
  duration, 
  ROUND((price * 0.5)::numeric, 2) as price,
  audio_enabled,
  is_per_second,
  'premium' as role
FROM credit_pricing
WHERE role = 'user'
ON CONFLICT DO NOTHING;

-- Step 6: Insert pricing for 'admin' role (free)
INSERT INTO credit_pricing (model_type, model_version, variant, duration, price, audio_enabled, is_per_second, role)
SELECT 
  model_type, 
  model_version, 
  variant, 
  duration, 
  0 as price,
  audio_enabled,
  is_per_second,
  'admin' as role
FROM credit_pricing
WHERE role = 'user'
ON CONFLICT DO NOTHING;
