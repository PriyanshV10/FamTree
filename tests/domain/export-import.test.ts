import { describe, it, expect } from "vitest";
import { DEMO_TREES, DEMO_PEOPLE, DEMO_RELATIONSHIPS } from "@/data/demo-data";
import {
  exportToGedcom,
  importFromGedcom,
  formatGedcomDate,
  parseGedcomDate,
  genderToGedcomSex,
  gedcomSexToGender,
} from "@/domain/export/gedcom";
import { exportToJson, importFromJson } from "@/domain/export/json-export";

const demoTree = DEMO_TREES[0];
const demoPeople = DEMO_PEOPLE;
const demoRelationships = DEMO_RELATIONSHIPS;

describe("GEDCOM 5.5.1 Export and Import", () => {
  it("formats and parses GEDCOM dates correctly", () => {
    expect(formatGedcomDate("1948-04-12")).toBe("12 APR 1948");
    expect(formatGedcomDate("1948-04")).toBe("APR 1948");
    expect(formatGedcomDate("1948")).toBe("1948");

    expect(parseGedcomDate("12 APR 1948")).toBe("1948-04-12");
    expect(parseGedcomDate("APR 1948")).toBe("1948-04");
    expect(parseGedcomDate("1948")).toBe("1948");
  });

  it("maps gender to and from GEDCOM SEX codes", () => {
    expect(genderToGedcomSex("male")).toBe("M");
    expect(genderToGedcomSex("female")).toBe("F");
    expect(genderToGedcomSex("other")).toBe("U");
    expect(genderToGedcomSex("unknown")).toBe("U");

    expect(gedcomSexToGender("M")).toBe("male");
    expect(gedcomSexToGender("F")).toBe("female");
    expect(gedcomSexToGender("U")).toBe("unknown");
    expect(gedcomSexToGender("O")).toBe("other");
  });

  it("exports demo lineage to valid GEDCOM 5.5.1 format", () => {
    const gedcom = exportToGedcom(demoTree, demoPeople, demoRelationships);

    expect(gedcom).toContain("0 HEAD");
    expect(gedcom).toContain("1 SOUR FamTree");
    expect(gedcom).toContain("2 VERS 5.5.1");
    expect(gedcom).toContain("1 CHAR UTF-8");
    expect(gedcom).toContain("0 TRLR");

    // Must include INDI records for people
    expect(gedcom).toContain("1 NAME Arthur James /Sterling/");
    expect(gedcom).toContain("1 SEX M");
    expect(gedcom).toContain("1 BIRT");
    expect(gedcom).toContain("2 PLAC Edinburgh, Scotland");

    // Must include FAM records
    expect(gedcom).toContain("FAM");
    expect(gedcom).toContain("1 MARR");
  });

  it("imports valid GEDCOM text back into people and relationships", () => {
    const gedcom = exportToGedcom(demoTree, demoPeople, demoRelationships);
    const { people, relationships } = importFromGedcom(gedcom, "test-import-tree");

    expect(people.length).toBe(demoPeople.length);
    expect(relationships.length).toBeGreaterThan(0);

    const arthur = people.find((p) => p.firstName === "Arthur" && p.lastName === "Sterling");
    expect(arthur).toBeDefined();
    expect(arthur?.gender).toBe("male");
    expect(arthur?.birthplace).toBe("Edinburgh, Scotland");

    // Spousal relationship check
    const hasSpouseRel = relationships.some((r) => r.type === "spouse");
    expect(hasSpouseRel).toBe(true);

    // Parent-child relationship check
    const hasParentChildRel = relationships.some((r) => r.type === "parent-child");
    expect(hasParentChildRel).toBe(true);
  });
});

describe("JSON Backup Export and Import", () => {
  it("exports tree and lineage into structured JSON format", () => {
    const jsonStr = exportToJson(demoTree, demoPeople, demoRelationships);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe("1.0.0");
    expect(parsed.generator).toBe("FamTree");
    expect(parsed.tree.id).toBe(demoTree.id);
    expect(parsed.people.length).toBe(demoPeople.length);
    expect(parsed.relationships.length).toBe(demoRelationships.length);
  });

  it("imports JSON backup with tree remapping", () => {
    const jsonStr = exportToJson(demoTree, demoPeople, demoRelationships);
    const result = importFromJson(jsonStr, "remapped-tree-id");

    expect(result.tree?.id).toBe("remapped-tree-id");
    expect(result.people.length).toBe(demoPeople.length);
    expect(result.people[0].treeId).toBe("remapped-tree-id");
    expect(result.relationships[0].treeId).toBe("remapped-tree-id");
  });

  it("throws descriptive error on malformed JSON import", () => {
    expect(() => importFromJson("not-valid-json")).toThrow(/Invalid JSON format/);
    expect(() => importFromJson(JSON.stringify({ invalid: true }))).toThrow(/missing 'people' array/);
  });
});
