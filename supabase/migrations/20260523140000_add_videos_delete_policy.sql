-- Allow users to delete their own video records
CREATE POLICY "videos_delete" ON videos FOR DELETE USING (auth.uid() = user_id);
