-- ============================================================================
-- Kinship / FamTree — Phase 4 Seed Data Script
-- ============================================================================
-- Populates the default trees, people, and relationships for development.
-- ============================================================================

-- 1. Family Trees
INSERT INTO public.family_trees (id, name, description, owner_name, cover_color, is_default, created_at, updated_at)
VALUES
  (
    'tree-sterling-chen',
    'The Sterling-Chen Lineage',
    'Three generations of the Sterling and Chen families spanning Cambridge, San Francisco, and Edinburgh.',
    'Maya Sterling-Chen',
    'bg-emerald-800',
    true,
    '2024-01-15T09:00:00Z',
    '2024-10-18T14:32:00Z'
  ),
  (
    'tree-beaumont-vance',
    'The Beaumont & Vance Heritage',
    'Pioneering families in the Pacific Northwest dating back to early 20th century maritime history.',
    'Eleanor Vance',
    'bg-amber-800',
    false,
    '2024-03-22T11:20:00Z',
    '2024-09-05T18:15:00Z'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;

-- 2. People (Sterling-Chen Tree)
INSERT INTO public.people (
  id, tree_id, first_name, middle_name, last_name, maiden_name, display_name,
  gender, birth_date, death_date, is_living, birth_place, occupation, bio, created_at, updated_at
) VALUES
  -- Gen 1
  ('person-1', 'tree-sterling-chen', 'Arthur', 'James', 'Sterling', NULL, NULL, 'male', '1934-03-12', '2018-11-20', false, 'Edinburgh, Scotland', 'Professor of Economic History', 'Arthur studied at the University of Edinburgh before emigrating to Massachusetts in 1958. Author of four books on maritime commerce.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-2', 'tree-sterling-chen', 'Eleanor', 'Ruth', 'Sterling', 'Vance', NULL, 'female', '1938-07-25', NULL, true, 'Boston, Massachusetts', 'Botanist & Illustrator', 'Eleanor spent thirty years cataloging coastal New England flora. Avid landscape watercolorist and gardener.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-3', 'tree-sterling-chen', 'Wei', NULL, 'Chen', NULL, 'Dr. Wei Chen', 'male', '1936-11-04', '2021-04-18', false, 'Taipei, Taiwan', 'Civil Engineer', 'Wei was a pioneering bridge engineer who oversaw major transit and seismic retrofit projects across California.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-4', 'tree-sterling-chen', 'Mei-Ling', NULL, 'Chen', 'Wu', NULL, 'female', '1940-02-19', NULL, true, 'San Francisco, California', 'Concert Pianist & Educator', 'Mei-Ling performed with symphonies across North America and taught piano pedagogy at the conservatory for over 35 years.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  
  -- Gen 2
  ('person-5', 'tree-sterling-chen', 'David', 'Arthur', 'Sterling', NULL, NULL, 'male', '1965-09-14', NULL, true, 'Cambridge, Massachusetts', 'Architectural Conservator', 'David preserves historic timber and masonry structures across New England. Restored over 40 landmark buildings.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-6', 'tree-sterling-chen', 'Hannah', 'Lin', 'Sterling', 'Chen', 'Dr. Hannah Chen', 'female', '1968-05-30', NULL, true, 'San Francisco, California', 'Pediatric Neurologist', 'Hannah directs pediatric neurology research and clinical care, specializing in rare neurodevelopmental conditions.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-7', 'tree-sterling-chen', 'Claire', 'Elizabeth', 'Sterling', NULL, NULL, 'female', '1969-12-03', NULL, true, 'Cambridge, Massachusetts', 'Documentary Film Editor', 'Claire has edited award-winning investigative documentaries on environmental science and historical movements.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-8', 'tree-sterling-chen', 'Jonathan', 'Kai', 'Chen', NULL, NULL, 'male', '1972-08-16', NULL, true, 'San Francisco, California', 'Urban Farming Director', 'Jonathan founded community agricultural collectives in the East Bay, focusing on food security and urban ecology.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-9', 'tree-sterling-chen', 'Marcus', 'Elliott', 'Reed', NULL, NULL, 'male', '1970-03-28', NULL, true, 'Portland, Oregon', 'Landscape Architect', 'Marcus designs public parklands and ecological restoration corridors integrating native Pacific Northwest ecosystems.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  
  -- Gen 3
  ('person-10', 'tree-sterling-chen', 'Maya', 'Soren', 'Sterling-Chen', NULL, NULL, 'female', '1998-04-12', NULL, true, 'Boston, Massachusetts', 'Software Engineer & Genealogist', 'Maya develops open-source tools for historical data preservation and genealogical lineage exploration.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-11', 'tree-sterling-chen', 'Julian', 'Kai', 'Sterling-Chen', NULL, NULL, 'male', '2001-10-05', NULL, true, 'Boston, Massachusetts', 'Marine Biology Researcher', 'Julian investigates benthic ecosystems and kelp forest resilience in the Gulf of Maine.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('person-12', 'tree-sterling-chen', 'Leo', 'Xavier', 'Reed-Chen', NULL, NULL, 'male', '2008-06-22', NULL, true, 'Oakland, California', 'High School Student', 'Leo is an avid cellist, robotics club builder, and youth soccer goalkeeper.', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = EXCLUDED.updated_at;

-- 3. Relationships (Sterling-Chen Tree)
INSERT INTO public.relationships (id, tree_id, person_id_1, person_id_2, type, start_date, created_at, updated_at)
VALUES
  -- Spouses Gen 1
  ('rel-1', 'tree-sterling-chen', 'person-1', 'person-2', 'spouse', '1962-06-18', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-2', 'tree-sterling-chen', 'person-3', 'person-4', 'spouse', '1966-08-12', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),

  -- Gen 1 to Gen 2 Parent-Child
  ('rel-3', 'tree-sterling-chen', 'person-1', 'person-5', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-4', 'tree-sterling-chen', 'person-2', 'person-5', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-5', 'tree-sterling-chen', 'person-1', 'person-7', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-6', 'tree-sterling-chen', 'person-2', 'person-7', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-7', 'tree-sterling-chen', 'person-3', 'person-6', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-8', 'tree-sterling-chen', 'person-4', 'person-6', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-9', 'tree-sterling-chen', 'person-3', 'person-8', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-10', 'tree-sterling-chen', 'person-4', 'person-8', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),

  -- Gen 2 Partnerships
  ('rel-11', 'tree-sterling-chen', 'person-5', 'person-6', 'spouse', '1995-09-09', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-12', 'tree-sterling-chen', 'person-8', 'person-9', 'spouse', '2005-06-25', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),

  -- Gen 2 to Gen 3 Parent-Child
  ('rel-13', 'tree-sterling-chen', 'person-5', 'person-10', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-14', 'tree-sterling-chen', 'person-6', 'person-10', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-15', 'tree-sterling-chen', 'person-5', 'person-11', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-16', 'tree-sterling-chen', 'person-6', 'person-11', 'parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-17', 'tree-sterling-chen', 'person-8', 'person-12', 'adoptive-parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
  ('rel-18', 'tree-sterling-chen', 'person-9', 'person-12', 'adoptive-parent-child', NULL, '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;
