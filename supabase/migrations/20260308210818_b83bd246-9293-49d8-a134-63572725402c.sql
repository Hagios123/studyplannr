-- Create storage bucket for custom sounds
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-sounds', 'custom-sounds', true);

-- Allow authenticated users to upload their own sounds
CREATE POLICY "Users can upload own sounds"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'custom-sounds' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read all sounds (public bucket)
CREATE POLICY "Anyone can read sounds"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'custom-sounds');

-- Allow users to delete their own sounds
CREATE POLICY "Users can delete own sounds"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'custom-sounds' AND (storage.foldername(name))[1] = auth.uid()::text);