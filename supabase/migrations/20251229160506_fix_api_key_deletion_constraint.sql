/*
  # Fix API Key Deletion Constraint

  1. Changes
    - Modify generation_history.api_key_id foreign key constraint
    - Change from ON DELETE NO ACTION to ON DELETE SET NULL
    - This allows API keys to be deleted without violating foreign key constraints
    - When an API key is deleted, related generation_history records will have their api_key_id set to NULL
    
  2. Notes
    - api_key_id is nullable, so SET NULL is safe
    - History records are preserved when API keys are deleted
    - This provides better data retention and user experience
*/

-- Drop existing foreign key constraint
ALTER TABLE generation_history 
DROP CONSTRAINT IF EXISTS generation_history_api_key_id_fkey;

-- Re-add foreign key constraint with SET NULL on delete
ALTER TABLE generation_history
ADD CONSTRAINT generation_history_api_key_id_fkey
FOREIGN KEY (api_key_id) 
REFERENCES api_keys(id) 
ON DELETE SET NULL;
