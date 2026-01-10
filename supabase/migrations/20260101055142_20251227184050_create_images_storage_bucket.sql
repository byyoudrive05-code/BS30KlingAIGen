/*
  # Create Images Storage Bucket

  1. Storage
    - Create `images` bucket for storing user-uploaded images
    - Enable public access for images
  
  2. Security
    - Allow authenticated users to upload images
    - Allow anyone to read images (public access)
*/

-- Create the images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow anyone to read images (public access)
CREATE POLICY "Anyone can read images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);