/*
  # Simplify Storage Policies for Non-Auth System

  1. Security
    - Allow anon and authenticated users to upload images
    - Allow public read access to images
    - Allow users to update and delete images in the bucket
  
  2. Notes
    - Since the app doesn't use Supabase Auth (only username-based login),
      we cannot use auth.uid() in policies
    - Simplified to allow uploads from anon key with basic restrictions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- Allow uploads to images bucket
CREATE POLICY "Allow uploads to images bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'images');

-- Allow anyone to read images
CREATE POLICY "Public read access for images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Allow updates in images bucket
CREATE POLICY "Allow updates in images bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Allow deletes in images bucket
CREATE POLICY "Allow deletes in images bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'images');