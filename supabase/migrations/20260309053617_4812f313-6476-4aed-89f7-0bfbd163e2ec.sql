
-- Create security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Create security definer function to check if group is public
CREATE OR REPLACE FUNCTION public.is_public_group(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_groups
    WHERE id = _group_id AND is_public = true
  )
$$;

-- Drop the problematic recursive policy on group_members
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- Drop and recreate the self-join insert policy
DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;
CREATE POLICY "Users can join public groups" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_public_group(group_id)
  );

-- Fix group_members owner insert policy to avoid recursion
DROP POLICY IF EXISTS "Group owner can add members" ON public.group_members;
CREATE POLICY "Group owner can add members" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_group_member(auth.uid(), group_id)
  );

-- Fix the delete policy
DROP POLICY IF EXISTS "Owner or self can remove members" ON public.group_members;
CREATE POLICY "Owner or self can remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_group_member(auth.uid(), group_id));

-- Fix the update policy
DROP POLICY IF EXISTS "Admins can update members" ON public.group_members;
CREATE POLICY "Admins can update members" ON public.group_members
  FOR UPDATE TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));
