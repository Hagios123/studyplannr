
-- Blocked users table
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON public.blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON public.blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- Add permissions column to group_members
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{"can_send_messages": true, "can_edit_group": false, "is_admin": false}'::jsonb;

-- Allow admins/owners to update group members
CREATE POLICY "Admins can update members" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND (gm.role = 'owner' OR (gm.permissions->>'is_admin')::boolean = true)
    )
  );
