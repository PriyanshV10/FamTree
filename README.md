# FamTree — Family Tree Generator & Lineage Explorer

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/React_Flow-@xyflow/react-ff0072)](https://reactflow.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-yellow?logo=vitest)](https://vitest.dev/)

**FamTree** is an elegant, responsive, privacy-first family tree builder and genealogical relationship discovery platform. It empowers families, genealogists, and historians to visually map ancestral lineages, discover precise kinships deterministically, and preserve generational history with an offline-first architecture and seamless cloud sync.

---

## ✨ Features

### 🌳 Interactive Genealogical Canvas
- **Infinite Visual Workspace**: Powered by `@xyflow/react` with smooth zooming, panning, fit-to-view, and an interactive minimap.
- **Custom Ancestry Nodes**: Render biographical details, maiden names, life dates, occupations, and profile portraits.
- **Partner & Union Junctions**: Generational links originate from mutual union nodes connecting couples, producing tidy, readable pedigree layouts.
- **Permanent Node & Sibling Reordering**: Move siblings past one another horizontally or swap spouse order with persistence across sessions.
- **Dynamic Reference Anchor**: Fix any person as the reference ancestor (Generation 0) to dynamically calculate generation numbers (Ancestors `Gen -N`, Descendants `Gen +N`) outward from them.
- **Compact & High-Contrast Modes**: One-click toggle between detailed cards and minimal name pills with tighter generational spacing.

### 🔍 Deterministic Relationship Engine
- **Graph-Based Kinship Resolver**: Mathematical Lowest Common Ancestor (LCA) algorithms calculate exact degrees of kinship:
  $$\text{Cousin Degree } k = \min(d_1, d_2) - 1$$
  $$\text{Generational Removal } r = |d_1 - d_2|$$
- **Step-by-Step Relationship Pathfinder**: Select any two family members to calculate their shortest connection path and highlight the entire lineage on the visual canvas.
- **Cycle Prevention**: Directed breadth-first search ($O(V + E)$) prevents generational paradoxes (e.g., descendants becoming ancestors).
- **Comprehensive Lineage Highlighting**: One-click illumination of complete direct ancestral or descendant trees.

### 💾 Dual-Tier Architecture: Offline-First + Cloud Sync
- **Zero-Config Local Mode**: Operates out-of-the-box using browser `localStorage`. Guests can immediately create and edit trees with full persistence without logging in.
- **Authenticated Cloud Mode**: Connects to Supabase PostgreSQL when signed in, automatically migrating and syncing locally created trees to the authenticated account.
- **Privacy & Isolation**: Row Level Security (RLS) ensures curators only view and modify their own trees.

### 🔗 Tree Sharing & Collaboration
- **Viewer Mode (`?share=viewer`)**: Anyone with the link can view the lineage in read-only mode without logging in.
- **Editor Mode (`?share=editor`)**: Authenticated users opening an editor link can fork and copy the entire tree (with all people, relationships, and layout configurations) directly into their own profile.

### 📦 Genealogical Data Interchange
- **GEDCOM 5.5.1 Compatibility**: Import and export universal genealogical records compatible with Ancestry, MyHeritage, FamilySearch, and Gramps.
- **Lossless JSON Backup**: Full snapshot export and restore preserving tree metadata, people, and typed relationships.
- **Print & PDF Pedigree Summary**: Clean printable lineage overview.

### ⏳ Generational Milestone Timeline
- Interactive chronological journey documenting family births, marriages, and passings grouped by decades with 1-click canvas focus.

### 🎨 Heirloom Design System & Dark Mode
- Warm, heritage-inspired typography (serif headings with clean sans-serif body text) in deep forest emerald (`#1B4D3E`) and heirloom warm neutrals.
- Built-in Dark Mode with automatic system preference detection and anti-FOUC hydration scripts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router with TurboPack) |
| **Language** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS v4, Lucide Icons |
| **Visualization** | React Flow (`@xyflow/react`) |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security, Auth) |
| **Forms & Validation** | React Hook Form, Zod |
| **Testing** | Vitest (130 unit, domain, and integration tests) |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or higher (v22 LTS recommended)
- **npm**: v10 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/FamTree.git
cd FamTree

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]
> FamTree will run in **Local Mode** out-of-the-box if Supabase environment variables are omitted.

---

## 🗄️ Database Setup (Supabase)

To enable cloud authentication and PostgreSQL persistence:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the migrations in order:
   - `supabase/migrations/20261024000000_initial_schema.sql`
   - `supabase/migrations/20261025000000_phase5_auth_rls.sql`
   - `supabase/migrations/20261026000000_fix_profiles_and_rls.sql`
3. Optional: Run `supabase/seed.sql` to populate starter demo trees.
4. Add your project credentials to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

---

## 🧪 Testing & Code Quality

FamTree includes a comprehensive test suite covering graph algorithms, cycle detection, relationship queries, GEDCOM parsing, and authentication routing.

```bash
# Run Vitest test suite
npm run test

# Run ESLint validation
npm run lint

# Compile production build
npm run build
```

---

## 📁 Repository Structure

```text
FamTree/
├── src/
│   ├── app/
│   │   ├── dashboard/page.tsx             # Tree index dashboard
│   │   ├── settings/page.tsx              # Settings & export preferences
│   │   ├── trees/[id]/
│   │   │   ├── page.tsx                   # Tree workspace route
│   │   │   └── person/[personId]/page.tsx # Person biographical record
│   │   ├── layout.tsx                     # Root App Router layout & metadata
│   │   ├── page.tsx                       # Landing page
│   │   └── icon.svg                       # FamTree brand favicon & app icon
│   ├── components/
│   │   ├── auth/                          # AuthProvider & auth modals
│   │   ├── layout/                        # Navbar and Footer
│   │   ├── person/                        # PersonFormModal & profile cards
│   │   ├── relationship/                  # RelationshipFinderModal & modals
│   │   ├── tree/                          # TreeCanvas, PeopleSidebar, TreeToolbar
│   │   └── ui/                            # Buttons, Dialogs, Cards, Inputs
│   ├── domain/                            # Framework-agnostic genealogical engine
│   │   ├── family-graph.ts                # Graph structure, cycles & LCA traversal
│   │   ├── relationship-engine.ts         # Cousin degree & kinship resolution
│   │   └── export/                        # GEDCOM 5.5.1 and JSON exporters
│   ├── lib/                               # Supabase client, layout & sync utilities
│   └── repositories/                      # ITreeRepository, Local & Supabase backends
├── supabase/
│   ├── migrations/                        # PostgreSQL schemas and RLS policies
│   └── seed.sql                           # Demonstration dataset
└── tests/                                 # 18 Vitest test suites (130 tests)
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
