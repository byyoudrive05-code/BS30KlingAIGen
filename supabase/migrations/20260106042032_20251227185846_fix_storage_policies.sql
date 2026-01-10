/*
  # Fix Storage Policies for Images Bucket

  1. Security
    - Drop existing policies if they exist
    - Recreate policies for authenticated users to upload images
    - Allow public read access to images
    - Allow users to delete their own images
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to read images (public access)
CREATE POLICY "Anyone can read images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Allow users to update their own images
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);