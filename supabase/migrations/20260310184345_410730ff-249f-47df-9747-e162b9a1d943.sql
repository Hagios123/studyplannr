-- Verify columns exist (will no-op if already added)
ALTER TABLE public.private_messages 
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.private_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Delete policy if not exists (will error if already exists, that's ok)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'private_messages' AND policyname = 'Sender can delete own messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Sender can delete own messages" ON public.private_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id)';
  END IF;
END $$;
