/*
  # Add api_key_id to generation_history

  1. Changes
    - Add `api_key_id` column to `generation_history` table
    - This tracks which API key was used for each video generation
    - Links to api_keys table with SET NULL on delete (history preserved)

  2. Notes
    - Column is nullable as existing records and legacy credit system don't use API keys
    - New generations can use either api_keys table or legacy user.api_key
*/

-- Add api_key_id column to generation_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'api_key_id'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generation_history_api_key_id ON generation_history(api_key_id);