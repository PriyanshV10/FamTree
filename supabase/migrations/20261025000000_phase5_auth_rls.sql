-- ============================================================================
-- Phase 5 Migration: Authentication, Privacy, and Strict Row Level Security (RLS)
-- Tightens database security, revokes wide-open development policies, and
-- enforces multi-tenant tree ownership, collaboration roles, and private defaults.
-- ============================================================================

-- 1. Drop Phase 4 development baseline policies
DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access on family_trees" ON public.family_trees;
DROP POLICY IF EXISTS "Allow public insert/update on family_trees" ON public.family_trees;
DROP POLICY IF EXISTS "Allow public read access on family_tree_members" ON public.family_tree_members;
DROP POLICY IF EXISTS "Allow public insert/update on family_tree_members" ON public.family_tree_members;
DROP POLICY IF EXISTS "Allow public read access on people" ON public.people;
DROP POLICY IF EXISTS "Allow public insert/update on people" ON public.people;
DROP POLICY IF EXISTS "Allow public read access on relationships" ON public.relationships;
DROP POLICY IF EXISTS "Allow public insert/update on relationships" ON public.relationships;

-- 2. Security helper function to check tree authorization without RLS recursion
CREATE OR REPLACE FUNCTION public.is_tree_accessible(check_tree_id text, required_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  tree_record record;
  member_record record;
BEGIN
  -- If tree doesn't exist, deny
  SELECT owner_id, is_private INTO tree_record
  FROM public.family_trees
  WHERE id = check_tree_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Anonymous / unauthenticated access: allow viewing ONLY if tree is explicitly non-private
  IF current_user_id IS NULL THEN
    RETURN (tree_record.is_private = false AND required_role = 'viewer');
  END IF;

  -- Owner has full access for all roles ('viewer', 'editor', 'owner')
  IF tree_record.owner_id = current_user_id THEN
    RETURN true;
  END IF;

  -- Check explicit membership in family_tree_members
  SELECT role INTO member_record
  FROM public.family_tree_members
  WHERE tree_id = check_tree_id AND user_id = current_user_id;

  IF FOUND THEN
    IF required_role = 'viewer' THEN
      RETURN true;
    ELSIF required_role = 'editor' AND member_record.role IN ('editor', 'owner') THEN
      RETURN true;
    ELSIF required_role = 'owner' AND member_record.role = 'owner' THEN
      RETURN true;
    END IF;
  END IF;

  -- Non-member viewing allowed only if tree is public
  IF required_role = 'viewer' AND tree_record.is_private = false THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 3. Profiles Table Policies
CREATE POLICY "Profiles readable by authenticated users or owner"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Family Trees Table Policies
CREATE POLICY "Trees accessible to owner, members, or public viewers"
  ON public.family_trees FOR SELECT
  USING (public.is_tree_accessible(id, 'viewer'));

CREATE POLICY "Authenticated users can create family trees"
  ON public.family_trees FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (owner_id IS NULL OR owner_id = auth.uid())
  );

CREATE POLICY "Tree owners and editors can update tree metadata"
  ON public.family_trees FOR UPDATE
  USING (public.is_tree_accessible(id, 'editor'))
  WITH CHECK (public.is_tree_accessible(id, 'editor'));

CREATE POLICY "Only tree owner can delete family tree"
  ON public.family_trees FOR DELETE
  USING (owner_id = auth.uid());

-- 5. Family Tree Members Table Policies
CREATE POLICY "Members viewable by tree viewers"
  ON public.family_tree_members FOR SELECT
  USING (public.is_tree_accessible(tree_id, 'viewer'));

CREATE POLICY "Tree owners can manage members"
  ON public.family_tree_members FOR ALL
  USING (public.is_tree_accessible(tree_id, 'owner'))
  WITH CHECK (public.is_tree_accessible(tree_id, 'owner'));

-- 6. People Table Policies
CREATE POLICY "People viewable by tree viewers"
  ON public.people FOR SELECT
  USING (public.is_tree_accessible(tree_id, 'viewer'));

CREATE POLICY "People insertable by tree editors and owners"
  ON public.people FOR INSERT
  WITH CHECK (public.is_tree_accessible(tree_id, 'editor'));

CREATE POLICY "People updatable by tree editors and owners"
  ON public.people FOR UPDATE
  USING (public.is_tree_accessible(tree_id, 'editor'))
  WITH CHECK (public.is_tree_accessible(tree_id, 'editor'));

CREATE POLICY "People deletable by tree editors and owners"
  ON public.people FOR DELETE
  USING (public.is_tree_accessible(tree_id, 'editor'));

-- 7. Relationships Table Policies
CREATE POLICY "Relationships viewable by tree viewers"
  ON public.relationships FOR SELECT
  USING (public.is_tree_accessible(tree_id, 'viewer'));

CREATE POLICY "Relationships insertable by tree editors and owners"
  ON public.relationships FOR INSERT
  WITH CHECK (public.is_tree_accessible(tree_id, 'editor'));

CREATE POLICY "Relationships updatable by tree editors and owners"
  ON public.relationships FOR UPDATE
  USING (public.is_tree_accessible(tree_id, 'editor'))
  WITH CHECK (public.is_tree_accessible(tree_id, 'editor'));

CREATE POLICY "Relationships deletable by tree editors and owners"
  ON public.relationships FOR DELETE
  USING (public.is_tree_accessible(tree_id, 'editor'));
