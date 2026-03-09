
-- Create study_rooms table for persistent, searchable rooms
CREATE TABLE public.study_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see public rooms
CREATE POLICY "Anyone can view public rooms" ON public.study_rooms
  FOR SELECT TO authenticated
  USING (is_public = true OR host_id = auth.uid());

-- Users can create rooms
CREATE POLICY "Users can create rooms" ON public.study_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Host can update their rooms
CREATE POLICY "Host can update rooms" ON public.study_rooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);

-- Host can delete their rooms
CREATE POLICY "Host can delete rooms" ON public.study_rooms
  FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

-- Add is_public column to study_groups for discoverable groups
ALTER TABLE public.study_groups ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Allow authenticated users to see public groups (for browsing/joining)
CREATE POLICY "Anyone can view public groups" ON public.study_groups
  FOR SELECT TO authenticated
  USING (is_public = true);

-- Allow users to join public groups themselves
CREATE POLICY "Users can join public groups" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.study_groups 
      WHERE id = group_id AND is_public = true
    )
  );
