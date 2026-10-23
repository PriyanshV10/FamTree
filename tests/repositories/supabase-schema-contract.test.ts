import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Supabase Schema & Migration Contract", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261024000000_initial_schema.sql"
  );
  const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");

  it("verifies migration file exists and contains all required tables", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Core tables
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.profiles");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.family_trees");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.family_tree_members");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.people");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.relationships");
  });

  it("verifies composite foreign key ensures relationships stay strictly within the same family tree", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Composite unique constraint on people
    expect(sql).toContain("CONSTRAINT uq_people_tree_id UNIQUE (tree_id, id)");

    // Composite foreign keys on relationships table
    expect(sql).toContain("FOREIGN KEY (tree_id, person_id_1)");
    expect(sql).toContain("REFERENCES public.people(tree_id, id)");
    expect(sql).toContain("FOREIGN KEY (tree_id, person_id_2)");
  });

  it("verifies self-relationship prevention constraint exists", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("CONSTRAINT chk_no_self_relationship CHECK (person_id_1 <> person_id_2)");
  });

  it("verifies duplicate relationship constraints exist for directed and mutual types", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("uq_directed_relationship");
    expect(sql).toContain("uq_mutual_spouse_relationship");
    expect(sql).toContain("LEAST(person_id_1, person_id_2)");
    expect(sql).toContain("GREATEST(person_id_1, person_id_2)");
  });

  it("verifies Row Level Security (RLS) is enabled for all tables", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.family_trees ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.family_tree_members ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;");
  });

  it("verifies seed script populates trees, people, and relationships", () => {
    expect(fs.existsSync(seedPath)).toBe(true);
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    expect(seedSql).toContain("tree-sterling-chen");
    expect(seedSql).toContain("person-1");
    expect(seedSql).toContain("rel-1");
  });
});
