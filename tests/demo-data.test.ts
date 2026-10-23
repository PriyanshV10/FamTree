import { describe, it, expect } from "vitest";
import {
  DEMO_TREES,
  DEMO_PEOPLE,
  DEMO_RELATIONSHIPS,
  getDemoTree,
  getDemoPeople,
  getDemoPerson,
  getImmediateRelatives,
} from "@/data/demo-data";
import { resolveDemoRelationship } from "@/lib/demo-relationship-resolver";

describe("Demo Data & Immediate Relatives", () => {
  it("has valid default tree with members", () => {
    expect(DEMO_TREES.length).toBeGreaterThan(0);
    const tree = getDemoTree("tree-sterling-chen");
    expect(tree).toBeDefined();
    expect(tree?.name).toBe("The Sterling-Chen Lineage");

    const people = getDemoPeople("tree-sterling-chen");
    expect(people.length).toBe(12);
  });

  it("retrieves individual person record accurately", () => {
    const person = getDemoPerson("person-1");
    expect(person).toBeDefined();
    expect(person?.firstName).toBe("Arthur");
    expect(person?.lastName).toBe("Sterling");
  });

  it("resolves immediate relatives for David Sterling (person-5)", () => {
    const relatives = getImmediateRelatives("person-5", "tree-sterling-chen");

    // Parents: Arthur & Eleanor
    expect(relatives.parents.length).toBe(2);
    expect(relatives.parents.map((p) => p.firstName).sort()).toEqual(["Arthur", "Eleanor"]);

    // Spouse: Hannah Chen
    expect(relatives.spouses.length).toBe(1);
    expect(relatives.spouses[0].firstName).toBe("Hannah");

    // Children: Maya & Julian
    expect(relatives.children.length).toBe(2);
    expect(relatives.children.map((c) => c.firstName).sort()).toEqual(["Julian", "Maya"]);

    // Sibling: Claire
    expect(relatives.siblings.length).toBe(1);
    expect(relatives.siblings[0].firstName).toBe("Claire");
  });

  it("calculates relationship between Arthur and Maya as Paternal Grandfather", () => {
    const arthur = getDemoPerson("person-1")!;
    const maya = getDemoPerson("person-10")!;

    const result = resolveDemoRelationship(
      arthur,
      maya,
      DEMO_PEOPLE,
      DEMO_RELATIONSHIPS
    );

    expect(result.relationshipLabel).toBe("Paternal Grandfather");
    expect(result.path.length).toBe(2);

    // Also verify common ancestors for collateral relatives (cousins: Maya & Leo)
    const leo = getDemoPerson("person-12")!;
    const cousinResult = resolveDemoRelationship(maya, leo, DEMO_PEOPLE, DEMO_RELATIONSHIPS);
    expect(cousinResult.relationshipLabel).toBe("First Cousin");
    expect(cousinResult.commonAncestors.length).toBeGreaterThan(0);
  });
});
