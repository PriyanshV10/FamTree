# FamTree — Family Tree Generator & Lineage Explorer

FamTree is an elegant, responsive, modern family tree builder and genealogical relationship discovery platform. It enables families to map ancestral lineages, discover generational relationships deterministically, and preserve oral family histories with a privacy-first architecture.

---

## Phased Development Status

- [x] **Phase 1 — Project Foundation and UI Shell** (Completed)
- [x] **Phase 2 — Core Domain Model and Relationship Engine** (Completed)
- [x] **Phase 3 — Connect the UI to the Real Domain Engine** (Completed)
- [x] **Phase 4 — Supabase Database & Persistent Family Trees** (Completed)
- [x] **Phase 5 — Authentication, Privacy, and Security (RLS)** (Completed)
- [x] **Phase 6 — Product Polish and Advanced Features** (Completed)
- [x] **Phase 7 — Deployment and Release Readiness** (Completed)

---

## Technology Stack

- **Framework**: Next.js 16 with App Router & TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 with custom warm neutral design system
- **Visualization Canvas**: React Flow (`@xyflow/react`)
- **Icons**: Lucide Icons (`lucide-react`)
- **Validation**: Zod
- **Form Handling**: React Hook Form with `@hookform/resolvers`
- **Testing**: Vitest for fast unit and domain testing
- **Deployment Target**: Vercel

---

## Visual Design System

FamTree avoids generic AI dashboard aesthetics in favor of a warm, heirloom-inspired visual identity:
- **Background**: Warm off-white (`#FBF9F5` / `#FAF8F5`)
- **Typography**: Dark charcoal (`#1E2320`) with serif headings and clean sans-serif body
- **Accents**: Deep forest emerald (`#1B4D3E`) and sage (`#2C6E49`)
- **Canvas**: Dotted grid with custom curved generational edges and rose spouse links
- **Cards**: Subtle stone borders (`#E5E1D8`), rounded corners, and restrained shadows

---

## Screens & Features Implemented in Phase 1

1. **Landing Page (`/`)**:
   - Introduction to FamTree with headline, value propositions, and feature highlights.
   - Live interactive visualizer teaser with links to the 3-generation demo tree.
2. **Dashboard (`/dashboard`)**:
   - Family tree index listing multiple trees (e.g. *The Sterling-Chen Lineage* and *The Beaumont & Vance Heritage*).
   - Generational statistics cards (Active Trees, Documented People, Max Generations, Privacy Status).
   - Search/filter trees and "Create Family Tree" dialog.
3. **Interactive Tree Workspace (`/trees/[id]`)**:
   - Clear indication of the currently active tree and metadata.
   - Searchable, filterable people sidebar (living, deceased, name search).
   - Large central React Flow canvas with custom `PersonNode` components.
   - Zoom, pan, fit-to-view, and minimap controls.
   - **Partner Edge Unions**: Children arrows originate directly from the partner edge junction connecting their parents.
   - **Compact View Mode**: One-click toggle between detailed cards and minimal name-only pills with tighter generational spacing.
   - Slide-over person details panel showing immediate family (parents, spouses, children, siblings).
4. **Dedicated Person Profile Page (`/trees/[id]/person/[personId]`)**:
   - Full genealogical record: birth/death dates, birthplace, career, biography, and timeline.
   - Interactive cards for all immediate relatives with bidirectional navigation.
5. **Add / Edit Person Form Modal**:
   - Accessible modal backed by React Hook Form and Zod validation.
   - Fields: First name, middle name, last name, maiden name, gender, living status, birth date, death date, birthplace, occupation, and biographical notes.
6. **Relationship Discovery Finder Modal**:
   - Pick any two people in the tree to calculate their relationship.
   - Displays relationship label, shared ancestors, and step-by-step connection journey.
   - "Highlight Path on Canvas" action to illuminate the route on the visual canvas.
7. **Settings & Account Page (`/settings`)**:
   - Curator display preferences (date representation formats, maiden name conventions).
   - Privacy-by-default notices and data export preview.
   - Phase tracker and engineering roadmap overview.

---

## Realistic Sample Dataset

Demonstration data is located in `src/data/demo-data.ts`, strictly decoupled from future production persistence:
- **Tree**: *The Sterling-Chen Lineage*
- **12 Members across 3 Generations**:
  - Generation 1: Arthur Sterling & Eleanor Vance, Dr. Wei Chen & Mei-Ling Wu
  - Generation 2: David Sterling & Dr. Hannah Chen, Claire Sterling, Jonathan Chen & Marcus Reed
  - Generation 3: Maya Sterling-Chen, Julian Sterling-Chen, Leo Reed-Chen (adopted)
- **Relationships**: Biological parent-child, adoptive parent-child, and spouses.

---

## Project Structure

```text
FamTree/
├── src/
│   ├── app/
│   │   ├── dashboard/page.tsx             # Tree dashboard
│   │   ├── settings/page.tsx              # Settings & preferences
│   │   ├── trees/[id]/
│   │   │   ├── page.tsx                   # Family tree workspace route
│   │   │   └── person/[personId]/page.tsx # Person profile page
│   │   ├── globals.css                    # Tailwind & React Flow theme
│   │   ├── layout.tsx                     # Root App Router layout
│   │   └── page.tsx                       # Landing page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                 # Responsive navigation
│   │   │   └── Footer.tsx                 # Footer
│   │   ├── person/
│   │   │   └── PersonFormModal.tsx        # Add/edit person modal
│   │   ├── relationship/
│   │   │   └── RelationshipFinderModal.tsx# Relationship discovery modal
│   │   ├── tree/
│   │   │   ├── PeopleSidebar.tsx          # Searchable people panel
│   │   │   ├── PersonDetailsPanel.tsx     # Person slide-over drawer
│   │   │   ├── PersonNode.tsx             # Custom React Flow node
│   │   │   ├── TreeCanvas.tsx             # Central React Flow canvas
│   │   │   ├── tree-layout.ts             # Node positioning & edges
│   │   │   ├── TreeToolbar.tsx            # Header actions & breadcrumbs
│   │   │   └── TreeWorkspace.tsx          # Full client workspace coordinator
│   │   └── ui/                            # Reusable UI primitives
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       └── textarea.tsx
│   ├── data/
│   │   └── demo-data.ts                   # Structured demonstration dataset
│   ├── lib/
│   │   ├── demo-relationship-resolver.ts  # Demo relationship resolver
│   │   └── utils.ts                       # Helpers & styling utilities
│   └── types/
│       └── index.ts                       # Domain & canvas TypeScript interfaces
├── tests/
│   ├── demo-data.test.ts                  # Tests for demo data & queries
│   └── utils.test.ts                      # Tests for utility helpers
├── .env.example                           # Placeholder environment configuration
├── .gitignore                             # Clean Git ignore rules
├── package.json                           # Dependencies and scripts
├── tsconfig.json                          # TypeScript configuration
└── vitest.config.mts                      # Vitest test configuration
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+

### Installation

```bash
# Clone the repository and navigate into the workspace
git clone <repo-url>
cd FamTree

# Install dependencies
npm install

# Copy environment example
cp .env.example .env.local
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm run test
```

### Checking Types and Linting

```bash
# Type check
npx tsc --noEmit

# ESLint
npm run lint
```

### Production Build

```bash
npm run build
```

---

## Domain Model & Algorithm Design (Phase 2)

The domain model is completely independent of React, React Flow, and Supabase, residing in `src/domain/`.

### Core Entities

- **`Person`**: Stable unique ID, names (first, middle, last, maiden, display), life dates (birth, death, isLiving), gender, birthplace, occupation, biography, photo URL, and timestamps. Accommodates incomplete dates and historical records.
- **`Relationship`**: Stable person IDs (`personId1` and `personId2`), direction, relationship type, dates, and notes.
- **`FamilyTree`**: Tree metadata, curator ownership, and member/generation metrics.

### Supported Relationship Types

- `parent-child`: Directed biological parentage.
- `adoptive-parent-child`: Directed legal adoption.
- `step-parent-child`: Directed step-parentage.
- `spouse`: Mutual marriage or registered domestic partnership.
- `former-spouse`: Mutual former marriage or partnership.

### Deterministic Relationship Resolver Algorithms

1. **Cycle Detection ($O(V + E)$)**:
   - Evaluated before adding parent-child relationships using directed BFS.
   - Prohibits child $C$ from becoming an ancestor of parent $P$ if $C$ is already reachable as a descendant of $P$.
2. **Shortest Relationship Path**:
   - Breadth-First Search (BFS) over the undirected representation of the family graph.
   - Finds the minimum number of hops connecting any two people across biological, marriage, and adoptive links.
3. **Common Ancestor & Cousin Degree Calculation**:
   - Traverses ancestors up to generation depth $N$.
   - Intersects ancestral sets to locate the Lowest Common Ancestor (LCA) with generation distances $d_1$ and $d_2$.
   - **Cousin Degree Formula**:
     $$\text{Degree } k = \min(d_1, d_2) - 1$$
     $$\text{Generational Removal } r = |d_1 - d_2|$$
     - $d_1 = 2, d_2 = 2 \implies$ **First Cousin**
     - $d_1 = 2, d_2 = 3 \implies$ **First Cousin Once Removed**
     - $d_1 = 3, d_2 = 3 \implies$ **Second Cousin**
4. **Distinction of Family Structures**:
   - Distinguishes biological, adoptive, step, and marriage connections without assumption.
   - Handles multi-partner, blended, and non-nuclear family structures.
   - Unsupported or distant connections return a human-readable path string rather than guessing.

---

## Database Architecture & Persistence (Phase 4)

FamTree uses a dual-tier persistence design with a unified repository layer (`ITreeRepository`):
- **Cloud Backend (`SupabaseTreeRepository`)**: Connects to Supabase PostgreSQL when credentials are provided in `.env.local`.
- **Local Fallback (`LocalTreeRepository`)**: When Supabase credentials are not provided or in offline environments, FamTree operates seamlessly out-of-the-box using browser storage with zero config, persisting data across browser refreshes and sessions.

### Normalized PostgreSQL Schema

Located in `supabase/migrations/20261024000000_initial_schema.sql`:

1. **`profiles`**: Extends `auth.users` with display name and avatar URL.
2. **`family_trees`**: Tree metadata, cover colors, curator ownership.
3. **`family_tree_members`**: Membership access levels (`owner`, `editor`, `viewer`) for collaborative lineages.
4. **`people`**: Person biographical records belonging to a tree (`tree_id`, names, dates, living status, birth place, occupation, bio, photo).
5. **`relationships`**: Typed connections between people in the tree (`parent-child`, `adoptive-parent-child`, `step-parent-child`, `spouse`, `former-spouse`).

### Database-Enforced Referential Integrity

- **Tree Isolation Constraint**: Relationships enforce that both endpoints belong to the exact same family tree at the PostgreSQL level via composite foreign keys:
  ```sql
  CONSTRAINT fk_rel_person_1 FOREIGN KEY (tree_id, person_id_1)
    REFERENCES public.people(tree_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_rel_person_2 FOREIGN KEY (tree_id, person_id_2)
    REFERENCES public.people(tree_id, id) ON DELETE CASCADE
  ```
- **Cycle Prevention**: Validated deterministically before insertion.
- **Self-Relation Prevention**: `CHECK (person_id_1 <> person_id_2)`.
- **Duplicate Prevention**: Unique partial indexes for directed and mutual spouse edges.

### Efficient Batch Loading

Tree workspaces avoid $N+1$ database queries. The repository's `getTreeGraph(treeId)` loads the tree metadata, all members, and all connections in concurrent batch queries in a single round-trip.

### Supabase Setup Instructions

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and run the contents of [`supabase/migrations/20261024000000_initial_schema.sql`](file:///home/priyansh/Development/FamTree/supabase/migrations/20261024000000_initial_schema.sql).
4. Run [`supabase/seed.sql`](file:///home/priyansh/Development/FamTree/supabase/seed.sql) to populate the demo family trees.
5. In your local `.env.local` file, add your project credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-publishable-key
   ```
6. Start the local server: `npm run dev`.

---

## Authentication, Privacy, and Security (Phase 5)

FamTree provides end-to-end authentication and database-level security with graceful local guest fallback:

- **Supabase Authentication**:
  - Email/password authentication, registration, password recovery, and OAuth exchange (`/login`, `/signup`, `/forgot-password`, `/auth/callback`).
  - Next.js Session Refresh Proxy (`src/middleware.ts`) keeping SSR and client sessions in sync.
  - Zero-config demo fallback: when Supabase credentials are not configured, FamTree defaults to an interactive local curator session.
- **Row Level Security (RLS)**:
  - Strict PostgreSQL policies (`supabase/migrations/20261025000000_phase5_auth_rls.sql`).
  - Helper security function `is_tree_accessible(tree_id, min_role)` validating `owner`, `editor`, or `viewer` access.
  - Granular table protection on `profiles`, `family_trees`, `family_tree_members`, `people`, and `relationships`.
- **Full-System Dark Mode**:
  - Tactile theme switcher (`light`, `dark`, `system`) with anti-FOUC hydration script.
  - Dynamic React Flow background dot grid, minimap masks, panels, and modals.

---

## Product Polish & Advanced Features (Phase 6)

- **GEDCOM 5.5.1 Export & Import (`src/domain/export/gedcom.ts`)**:
  - Universal genealogy standard compatibility (Ancestry, MyHeritage, FamilySearch, Gramps).
  - Generates and parses `HEAD`, `INDI`, `FAM`, `BIRT`, `DEAT`, `MARR`, and notes.
- **High-Fidelity JSON Backup & Restore (`src/domain/export/json-export.ts`)**:
  - Full dataset backup preserving tree metadata, all members, and typed relationships.
- **Generational Milestone Timeline (`TimelineModal.tsx`)**:
  - Interactive chronological journey of family births, unions, and passings grouped by decades.
  - Direct 1-click focus from timeline events to nodes on the tree canvas.
- **Enhanced People Directory (`PeopleSidebar.tsx`)**:
  - Generational filtering (`Gen 1 (Ancestors)`, `Gen 2`, `Gen 3`, etc.).
  - Multi-attribute sorting (`Name A-Z`, `Birth Year`, `Generation`).
  - Living status filtering.
- **Photo Portrait Upload & Management (`PersonFormModal.tsx`)**:
  - Client-side image upload with live portrait preview and remove capabilities.
- **Print & PDF Tree Summary (`ExportImportModal.tsx`)**:
  - Quick printable pedigree view and PDF export via system dialog.

---

## Project Phase Status Summary

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Interactive Canvas UI Shell, Nodes, and Mock Controls | **Completed** |
| **Phase 2** | Core Domain Model, FamilyGraph, Cycle Prevention & Cousin Calculation | **Completed** |
| **Phase 3** | Interactive UI to Real Domain Engine Integration | **Completed** |
| **Phase 4** | Supabase PostgreSQL Schema, Repositories & Local Fallback | **Completed** |
| **Phase 5** | Supabase Auth, Row Level Security (RLS) & Dark Mode | **Completed** |
| **Phase 6** | Product Polish, GEDCOM/JSON Export/Import, Timeline & Milestone Explorer | **Completed** |
| **Phase 7** | Production Build, Zero Lint Warnings, 122 Tests & Vercel Deployment Readiness | **Completed** |

---

## Deployment & Release Guide (Phase 7)

FamTree is production-ready and configured for 1-click deployment on [Vercel](https://vercel.com):

1. **Connect Git Repository**: Import your FamTree repository into Vercel.
2. **Environment Variables**: In your Vercel Project Settings, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://<ref>.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon/Public API Key.
   - `NEXT_PUBLIC_APP_URL`: Your production custom domain or Vercel URL (`https://your-domain.vercel.app`).
   *(Note: If Supabase variables are omitted, FamTree safely falls back to local in-browser mode).*
3. **Build Command**: `next build`
4. **Output Directory**: `.next`
5. **Install Command**: `npm install`

