-- Update Database Schema for Kling AI
--
-- ## Overview
-- This migration updates the database schema to support Kling AI video generation
-- using fal.ai instead of Sora. It adds support for multiple Kling versions with
-- different pricing models.
--
-- ## Changes Made
--
-- 1. Update generation_history Table
--    - Add model_type column to track which Kling model was used
--    - Add model_version column for version tracking (v2.6, v2.5, v2.1)
--    - Add variant column for model variant (text-to-video, image-to-video, motion-control, etc)
--    - Add audio_enabled column for models with audio option
--    - Add video_url_2 column for motion control models that may return multiple outputs
--    - Add metadata JSONB column for additional parameters
--
-- 2. Update credit_pricing Table
--    - Remove old unique constraint on duration
--    - Add model_type column
--    - Add model_version column
--    - Add variant column
--    - Add audio_enabled column
--    - Add is_per_second column for motion control pricing
--    - Add composite unique index
--    - Remove old Sora pricing entries
--    - Add all Kling AI pricing configurations
--
-- ## Security
--    - No RLS policy changes needed as existing policies cover the new columns

-- Add columns to generation_history table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'model_type'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN model_type text DEFAULT 'kling';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'model_version'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN model_version text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'variant'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN variant text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'audio_enabled'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN audio_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'video_url_2'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN video_url_2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_history' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE generation_history ADD COLUMN metadata jsonb;
  END IF;
END $$;

-- Update credit_pricing table structure
DO $$
BEGIN
  -- Drop old unique constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credit_pricing_duration_key'
  ) THEN
    ALTER TABLE credit_pricing DROP CONSTRAINT credit_pricing_duration_key;
  END IF;

  -- Add new columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_pricing' AND column_name = 'model_type'
  ) THEN
    ALTER TABLE credit_pricing ADD COLUMN model_type text DEFAULT 'kling';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_pricing' AND column_name = 'model_version'
  ) THEN
    ALTER TABLE credit_pricing ADD COLUMN model_version text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_pricing' AND column_name = 'variant'
  ) THEN
    ALTER TABLE credit_pricing ADD COLUMN variant text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_pricing' AND column_name = 'audio_enabled'
  ) THEN
    ALTER TABLE credit_pricing ADD COLUMN audio_enabled boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_pricing' AND column_name = 'is_per_second'
  ) THEN
    ALTER TABLE credit_pricing ADD COLUMN is_per_second boolean DEFAULT false;
  END IF;
END $$;

-- Create unique index to prevent duplicate pricing configurations
DROP INDEX IF EXISTS idx_credit_pricing_unique_config;
CREATE UNIQUE INDEX idx_credit_pricing_unique_config
  ON credit_pricing (model_type, model_version, variant, duration, COALESCE(audio_enabled, false));

-- Clear old Sora pricing and insert Kling AI pricing
DELETE FROM credit_pricing;

-- Kling v2.6 Text to Video
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.6', 'text-to-video', 5, false, 0.35, false),
  ('kling', 'v2.6', 'text-to-video', 5, true, 0.7, false),
  ('kling', 'v2.6', 'text-to-video', 10, false, 0.7, false),
  ('kling', 'v2.6', 'text-to-video', 10, true, 1.4, false);

-- Kling v2.6 Image to Video
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.6', 'image-to-video', 5, false, 0.35, false),
  ('kling', 'v2.6', 'image-to-video', 5, true, 0.7, false),
  ('kling', 'v2.6', 'image-to-video', 10, false, 0.7, false),
  ('kling', 'v2.6', 'image-to-video', 10, true, 1.4, false);

-- Kling v2.6 Motion Control Standard (per second pricing)
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.6', 'motion-control-standard', 1, false, 0.07, true);

-- Kling v2.6 Motion Control Pro (per second pricing)
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.6', 'motion-control-pro', 1, false, 0.112, true);

-- Kling v2.5 Turbo Image to Video Standard
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.5-turbo', 'image-to-video-standard', 5, false, 0.21, false),
  ('kling', 'v2.5-turbo', 'image-to-video-standard', 10, false, 0.42, false);

-- Kling v2.5 Turbo Text to Video Pro
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.5-turbo', 'text-to-video-pro', 5, false, 0.35, false),
  ('kling', 'v2.5-turbo', 'text-to-video-pro', 10, false, 0.7, false);

-- Kling v2.5 Turbo Image to Video Pro
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.5-turbo', 'image-to-video-pro', 5, false, 0.35, false),
  ('kling', 'v2.5-turbo', 'image-to-video-pro', 10, false, 0.7, false);

-- Kling v2.1 Image to Video Standard
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.1', 'image-to-video-standard', 5, false, 0.25, false),
  ('kling', 'v2.1', 'image-to-video-standard', 10, false, 0.50, false);

-- Kling v2.1 Image to Video Pro
INSERT INTO credit_pricing (model_type, model_version, variant, duration, audio_enabled, price, is_per_second)
VALUES
  ('kling', 'v2.1', 'image-to-video-pro', 5, false, 0.45, false),
  ('kling', 'v2.1', 'image-to-video-pro', 10, false, 0.9, false);