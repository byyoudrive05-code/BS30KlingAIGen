/*
  # Add fal.ai URLs to generation history

  1. Changes
    - Add `fal_status_url` column to store the full status URL from fal.ai response
    - Add `fal_response_url` column to store the full response URL from fal.ai response
    - Add `fal_cancel_url` column to store the full cancel URL from fal.ai response
    - Add `fal_endpoint` column to store the endpoint used for generation
  
  2. Purpose
    - Store complete URLs from fal.ai to avoid endpoint confusion
    - Enable direct status checking using provided URLs
    - Track which endpoint was used for each generation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'fal_status_url'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN fal_status_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'fal_response_url'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN fal_response_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'fal_cancel_url'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN fal_cancel_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'fal_endpoint'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN fal_endpoint text;
  END IF;
END $$;