-- ============================================================================
-- Fix: Auto-Profile Generation, Foreign Key Integrity, and Tree Access Controls
-- ============================================================================
-- 1. Adds missing `is_private` column to family_trees table.
-- 2. Automatically backfills profiles for all existing registered auth users.
-- 3. Creates an automatic trigger on auth.users so any new registered user
--    immediately gets a corresponding public.profiles row.
-- 4. Claims unowned trees whose owner_name matches the registered user's email/name.
-- 5. Updates public.is_tree_accessible to safely check tree privacy and default starter trees.
-- ============================================================================

-- 1. Ensure `is_private` column exists on public.family_trees
ALTER TABLE public.family_trees 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- 2. Populate public.profiles for all existing users in auth.users
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Tree Curator'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

-- 3. Trigger to automatically create a public.profiles row whenever a user registers in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Tree Curator'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Claim unowned trees whose owner_name matches registered user accounts
UPDATE public.family_trees ft
SET owner_id = u.id
FROM auth.users u
WHERE ft.owner_id IS NULL 
  AND ft.is_default = false
  AND (
    lower(ft.owner_name) = lower(split_part(u.email, '@', 1)) OR
    lower(ft.owner_name) = lower(COALESCE(u.raw_user_meta_data->>'full_name', ''))
  );

-- 5. Resilient is_tree_accessible RLS security function
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

-- 6. Ensure RLS policies on profiles allow users to create and update their profiles
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles readable by authenticated users or owner" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated users or owner"
  ON public.profiles FOR SELECT
  USING (true);
