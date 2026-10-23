import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 5 Row Level Security (RLS) Database Contract", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261025000000_phase5_auth_rls.sql"
  );

  it("should have Phase 5 migration file present on disk", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  const sqlContent = fs.readFileSync(migrationPath, "utf-8");

  it("should revoke wide-open development policies from Phase 4", () => {
    expect(sqlContent).toContain("DROP POLICY IF EXISTS \"Allow public read access on family_trees\"");
    expect(sqlContent).toContain("DROP POLICY IF EXISTS \"Allow public insert/update on family_trees\"");
    expect(sqlContent).toContain("DROP POLICY IF EXISTS \"Allow public read access on people\"");
    expect(sqlContent).toContain("DROP POLICY IF EXISTS \"Allow public insert/update on people\"");
    expect(sqlContent).toContain("DROP POLICY IF EXISTS \"Allow public read access on relationships\"");
    expect(sqlContent).toContain("DROP POLICY IF EXISTS \"Allow public insert/update on relationships\"");
  });

  it("should define is_tree_accessible security definer function to avoid RLS recursion", () => {
    expect(sqlContent).toContain("FUNCTION public.is_tree_accessible");
    expect(sqlContent).toContain("SECURITY DEFINER");
    expect(sqlContent).toContain("auth.uid()");
  });

  it("should enforce multi-role authorization (owner, editor, viewer)", () => {
    expect(sqlContent).toContain("public.is_tree_accessible(id, 'viewer')");
    expect(sqlContent).toContain("public.is_tree_accessible(id, 'editor')");
    expect(sqlContent).toContain("public.is_tree_accessible(tree_id, 'editor')");
    expect(sqlContent).toContain("public.is_tree_accessible(tree_id, 'owner')");
  });

  it("should enforce user-restricted mutation on family_trees (only creator can insert, only owner can delete)", () => {
    expect(sqlContent).toContain("auth.role() = 'authenticated'");
    expect(sqlContent).toContain("owner_id = auth.uid()");
  });

  it("should enforce cascading authorization on people and relationships based on tree membership", () => {
    // People table policies
    expect(sqlContent).toContain("ON public.people FOR SELECT");
    expect(sqlContent).toContain("ON public.people FOR INSERT");
    expect(sqlContent).toContain("ON public.people FOR UPDATE");
    expect(sqlContent).toContain("ON public.people FOR DELETE");

    // Relationships table policies
    expect(sqlContent).toContain("ON public.relationships FOR SELECT");
    expect(sqlContent).toContain("ON public.relationships FOR INSERT");
    expect(sqlContent).toContain("ON public.relationships FOR UPDATE");
    expect(sqlContent).toContain("ON public.relationships FOR DELETE");
  });
});
