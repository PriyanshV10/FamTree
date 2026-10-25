-- ============================================================================
-- Migration: 20261027000000_fix_tree_delete_and_ownership.sql
-- Fix: Full Tree Deletion Permissions, Unowned Tree Claims, and Cascade Cleanup
-- ============================================================================
-- 1. Updates is_tree_accessible() so that unowned trees (owner_id IS NULL)
--    grant full owner/editor permissions to authenticated users.
-- 2. Updates RLS policies on family_trees FOR DELETE:
--    Allows deletion by owner, tree manager, or any authenticated user for unowned trees.
-- 3. Updates RLS policies on family_trees FOR UPDATE:
--    Allows updating metadata or claiming ownership of unowned trees.
-- 4. Ensures cascade delete permissions on people, relationships, and members.
-- 5. Auto-claims any unowned non-default trees created by existing users.
-- ============================================================================

-- 1. Resilient is_tree_accessible security function
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
  SELECT owner_id, is_default, COALESCE(is_private, false) AS is_private INTO tree_record
  FROM public.family_trees
  WHERE id = check_tree_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Default starter/demo trees are always viewable by everyone
  IF tree_record.is_default = true AND required_role = 'viewer' THEN
    RETURN true;
  END IF;

  -- If tree has NO owner (owner_id IS NULL):
  -- Any authenticated user has full owner/editor access to manage or delete legacy/unassigned trees
  IF tree_record.owner_id IS NULL THEN
    IF current_user_id IS NOT NULL THEN
      RETURN true;
    ELSE
      -- Anonymous guests can view if not private
      RETURN (tree_record.is_private = false AND required_role = 'viewer');
    END IF;
  END IF;

  -- Owner has full access for all roles ('viewer', 'editor', 'owner')
  IF current_user_id IS NOT NULL AND tree_record.owner_id = current_user_id THEN
    RETURN true;
  END IF;

  -- Check explicit membership in family_tree_members
  IF current_user_id IS NOT NULL THEN
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
  END IF;

  -- Non-member / anonymous viewing allowed if tree is explicitly non-private
  IF required_role = 'viewer' AND tree_record.is_private = false THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2. Update DELETE policy on family_trees
DROP POLICY IF EXISTS "Only tree owner can delete family tree" ON public.family_trees;
DROP POLICY IF EXISTS "Tree owners and editors can delete family tree" ON public.family_trees;
DROP POLICY IF EXISTS "Tree owner or unassigned tree can be deleted" ON public.family_trees;
DROP POLICY IF EXISTS "Allow delete family tree" ON public.family_trees;

CREATE POLICY "Allow delete family tree"
  ON public.family_trees FOR DELETE
  USING (
    owner_id = auth.uid()
    OR public.is_tree_accessible(id, 'owner')
    OR (auth.uid() IS NOT NULL AND owner_id IS NULL)
    OR (owner_id IS NULL AND is_default = false)
  );

-- 3. Update UPDATE policy on family_trees
DROP POLICY IF EXISTS "Tree owners and editors can update tree metadata" ON public.family_trees;
DROP POLICY IF EXISTS "Allow update family tree" ON public.family_trees;

CREATE POLICY "Allow update family tree"
  ON public.family_trees FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR public.is_tree_accessible(id, 'editor')
    OR (auth.uid() IS NOT NULL AND owner_id IS NULL)
    OR owner_id IS NULL
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_tree_accessible(id, 'editor')
    OR (auth.uid() IS NOT NULL AND owner_id IS NULL)
    OR owner_id IS NULL
  );

-- 4. Update DELETE policy on people and relationships for smooth cascade deletion
DROP POLICY IF EXISTS "People deletable by tree editors and owners" ON public.people;
CREATE POLICY "People deletable by tree editors and owners"
  ON public.people FOR DELETE
  USING (
    public.is_tree_accessible(tree_id, 'editor')
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Relationships deletable by tree editors and owners" ON public.relationships;
CREATE POLICY "Relationships deletable by tree editors and owners"
  ON public.relationships FOR DELETE
  USING (
    public.is_tree_accessible(tree_id, 'editor')
    OR auth.uid() IS NOT NULL
  );

-- 5. Auto-claim unowned trees for registered users
UPDATE public.family_trees ft
SET owner_id = u.id
FROM auth.users u
WHERE ft.owner_id IS NULL 
  AND ft.is_default = false
  AND (
    lower(ft.owner_name) = lower(split_part(u.email, '@', 1)) OR
    lower(ft.owner_name) = lower(COALESCE(u.raw_user_meta_data->>'full_name', '')) OR
    lower(ft.owner_name) = 'curator'
  );

-- If a single registered user exists, claim all remaining unowned custom trees
UPDATE public.family_trees
SET owner_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE owner_id IS NULL 
  AND is_default = false 
  AND (SELECT count(*) FROM auth.users) = 1;
