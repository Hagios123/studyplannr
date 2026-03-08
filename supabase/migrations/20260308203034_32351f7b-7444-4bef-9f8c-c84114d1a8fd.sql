
-- Persistent subject channels for groups
CREATE TABLE public.group_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, name)
);

ALTER TABLE public.group_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view channels" ON public.group_channels
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = group_channels.group_id AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Group members can create channels" ON public.group_channels
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM group_members WHERE group_members.group_id = group_channels.group_id AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator or owner can delete channels" ON public.group_channels
  FOR DELETE USING (
    auth.uid() = created_by OR EXISTS (
      SELECT 1 FROM group_members WHERE group_members.group_id = group_channels.group_id AND group_members.user_id = auth.uid() AND group_members.role = 'owner'
    )
  );

-- Group quizzes
CREATE TABLE public.group_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
);

ALTER TABLE public.group_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view quizzes" ON public.group_quizzes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_members.group_id = group_quizzes.group_id AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Group members can create quizzes" ON public.group_quizzes
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM group_members WHERE group_members.group_id = group_quizzes.group_id AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update quizzes" ON public.group_quizzes
  FOR UPDATE USING (auth.uid() = created_by);

-- Group quiz responses
CREATE TABLE public.group_quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.group_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

ALTER TABLE public.group_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view responses" ON public.group_quiz_responses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM group_quizzes gq
    JOIN group_members gm ON gm.group_id = gq.group_id
    WHERE gq.id = group_quiz_responses.quiz_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Users can submit responses" ON public.group_quiz_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses" ON public.group_quiz_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for quizzes
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_quiz_responses;
