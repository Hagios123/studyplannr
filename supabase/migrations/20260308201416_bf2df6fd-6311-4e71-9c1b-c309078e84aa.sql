
-- Friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert friendships" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they received" ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Study Groups table
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT 'hsl(187, 80%, 42%)',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

-- Group Members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS for study_groups: members can view, owner can update/delete
CREATE POLICY "Members can view groups" ON public.study_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = study_groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can create groups" ON public.study_groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner can update groups" ON public.study_groups
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Owner can delete groups" ON public.study_groups
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- RLS for group_members
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group owner can add members" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'owner'
    )
    OR
    auth.uid() = user_id
  );

CREATE POLICY "Owner or self can remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'owner'
    )
  );

-- Group Notes table
CREATE TABLE public.group_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  file_url TEXT,
  file_name TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view notes" ON public.group_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_notes.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create notes" ON public.group_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_notes.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Author can update notes" ON public.group_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Author or owner can delete notes" ON public.group_notes
  FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_notes.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'owner'
    )
  );

-- Group Goals table
CREATE TABLE public.group_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view goals" ON public.group_goals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_goals.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create goals" ON public.group_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_goals.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can update goals" ON public.group_goals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_goals.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can delete goals" ON public.group_goals
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_goals.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Storage bucket for group note files
INSERT INTO storage.buckets (id, name, public) VALUES ('group-files', 'group-files', true);

CREATE POLICY "Group members can upload files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'group-files');

CREATE POLICY "Anyone can view group files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'group-files');

CREATE POLICY "Owners can delete group files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'group-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Make profiles searchable by other authenticated users for friend search
CREATE POLICY "Authenticated can search profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
