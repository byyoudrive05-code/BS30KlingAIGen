/*
  # Add request_id column to generation_history

  1. Changes
    - Add request_id column to store GMICloud request ID for tracking
    - This allows us to poll for status updates if needed

  2. Notes
    - Column is nullable as existing records won't have it
    - Future records will store the GMICloud request_id
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN request_id text;
  END IF;
END $$;