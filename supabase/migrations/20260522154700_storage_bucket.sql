INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  52428800,
  ARRAY['audio/mpeg', 'audio/mp3', 'video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload to videos bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read access for videos bucket"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
