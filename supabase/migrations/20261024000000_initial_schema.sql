-- ============================================================================
-- Kinship / FamTree — Phase 4 Database Schema Migration
-- ============================================================================
-- Normalized PostgreSQL schema for family trees, members, people, and relationships.
-- Enforces referential integrity, tree isolation, and composite foreign keys.
-- ============================================================================

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Family Trees Table
CREATE TABLE IF NOT EXISTS public.family_trees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL DEFAULT 'Tree Curator',
  cover_color TEXT DEFAULT 'bg-emerald-800',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Family Tree Memberships (Multi-user collaboration & permissions)
CREATE TABLE IF NOT EXISTS public.family_tree_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id TEXT NOT NULL REFERENCES public.family_trees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_tree_member UNIQUE (tree_id, user_id)
);

-- 4. People Table
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT NOT NULL,
  tree_id TEXT NOT NULL REFERENCES public.family_trees(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  maiden_name TEXT,
  display_name TEXT,
  gender TEXT NOT NULL DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  birth_date TEXT,
  death_date TEXT,
  is_living BOOLEAN NOT NULL DEFAULT true,
  birth_place TEXT,
  occupation TEXT,
  bio TEXT,
  photo_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  -- Crucial for composite foreign key constraint in relationships
  CONSTRAINT uq_people_tree_id UNIQUE (tree_id, id)
);

-- 5. Relationships Table
CREATE TABLE IF NOT EXISTS public.relationships (
  id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL REFERENCES public.family_trees(id) ON DELETE CASCADE,
  person_id_1 TEXT NOT NULL,
  person_id_2 TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'parent-child',
    'adoptive-parent-child',
    'step-parent-child',
    'spouse',
    'former-spouse'
  )),
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Prevent connecting a person to themselves
  CONSTRAINT chk_no_self_relationship CHECK (person_id_1 <> person_id_2),
  
  -- DATABASE-ENFORCED INTEGRITY:
  -- Guarantees that both person_id_1 and person_id_2 belong to the exact same tree!
  CONSTRAINT fk_rel_person_1 FOREIGN KEY (tree_id, person_id_1)
    REFERENCES public.people(tree_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_rel_person_2 FOREIGN KEY (tree_id, person_id_2)
    REFERENCES public.people(tree_id, id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for High-Performance Graph Queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_people_tree_id ON public.people(tree_id);
CREATE INDEX IF NOT EXISTS idx_relationships_tree_id ON public.relationships(tree_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person_1 ON public.relationships(person_id_1);
CREATE INDEX IF NOT EXISTS idx_relationships_person_2 ON public.relationships(person_id_2);
CREATE INDEX IF NOT EXISTS idx_relationships_lookup ON public.relationships(tree_id, person_id_1, person_id_2);
CREATE INDEX IF NOT EXISTS idx_tree_members_user ON public.family_tree_members(user_id);

-- Prevent duplicate directed relationships
CREATE UNIQUE INDEX IF NOT EXISTS uq_directed_relationship ON public.relationships (tree_id, person_id_1, person_id_2, type)
  WHERE type IN ('parent-child', 'adoptive-parent-child', 'step-parent-child');

-- Prevent duplicate mutual spouse relationships (irrespective of ordering)
CREATE UNIQUE INDEX IF NOT EXISTS uq_mutual_spouse_relationship ON public.relationships (
  tree_id,
  LEAST(person_id_1, person_id_2),
  GREATEST(person_id_1, person_id_2),
  type
)
WHERE type IN ('spouse', 'former-spouse');

-- ============================================================================
-- Timestamp Automation Function and Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_family_trees_updated_at ON public.family_trees;
CREATE TRIGGER set_family_trees_updated_at
  BEFORE UPDATE ON public.family_trees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_people_updated_at ON public.people;
CREATE TRIGGER set_people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_relationships_updated_at ON public.relationships;
CREATE TRIGGER set_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Setup
-- Enabled now; comprehensive Phase 5 authorization policies will expand here.
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

-- Development / Phase 4 baseline access policies (public read/write when anon key is used)
-- These will be locked down strictly per user ID in Phase 5.
CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow public read access on family_trees"
  ON public.family_trees FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on family_trees"
  ON public.family_trees FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on family_tree_members"
  ON public.family_tree_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on family_tree_members"
  ON public.family_tree_members FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on people"
  ON public.people FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on people"
  ON public.people FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on relationships"
  ON public.relationships FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on relationships"
  ON public.relationships FOR ALL USING (true) WITH CHECK (true);
