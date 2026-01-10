/*
  # Remove provider field from API keys

  1. Changes
    - Remove `provider` column from `api_keys` table
    - Keep only: user_id, api_key, credits, is_active
  
  2. Notes
    - This simplifies the API key management
    - All API keys are assumed to be for the same provider
*/

-- Remove provider column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'provider'
  ) THEN
    ALTER TABLE api_keys DROP COLUMN provider;
  END IF;
END $$;