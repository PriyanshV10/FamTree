import { describe, it, expect, beforeEach } from "vitest";
import { FamilyGraph } from "@/domain/family-graph";

describe("FamilyGraph Service", () => {
  let graph: FamilyGraph;

  beforeEach(() => {
    graph = new FamilyGraph("test-tree");
  });

  it("adds, retrieves, and updates people", () => {
    const person = graph.addPerson({
      treeId: "test-tree",
      firstName: "Grace",
      lastName: "Hopper",
      birthDate: "1906-12-09",
      gender: "female",
    });

    expect(person.id).toBeDefined();
    expect(graph.getPerson(person.id)).toEqual(person);

    const updated = graph.updatePerson(person.id, {
      occupation: "Computer Scientist & US Navy Rear Admiral",
    });
    expect(updated.occupation).toBe("Computer Scientist & US Navy Rear Admiral");
    expect(graph.getPerson(person.id)?.occupation).toBe(
      "Computer Scientist & US Navy Rear Admiral"
    );
  });

  it("removes a person and cascades relationship cleanup", () => {
    const parent = graph.addPerson({ treeId: "test-tree", firstName: "Parent", lastName: "One" });
    const child = graph.addPerson({ treeId: "test-tree", firstName: "Child", lastName: "One" });

    const rel = graph.addRelationship({
      treeId: "test-tree",
      personId1: parent.id,
      personId2: child.id,
      type: "parent-child",
    });

    expect(graph.getParents(child.id)).toHaveLength(1);
    expect(graph.getRelationship(rel.id)).toBeDefined();

    // Removing parent
    const removed = graph.removePerson(parent.id);
    expect(removed).toBe(true);
    expect(graph.getPerson(parent.id)).toBeUndefined();

    // Relationship must be removed cleanly
    expect(graph.getRelationship(rel.id)).toBeUndefined();
    expect(graph.getParents(child.id)).toHaveLength(0);
  });

  it("finds spouses and former spouses", () => {
    const p1 = graph.addPerson({ treeId: "test-tree", firstName: "Alex", lastName: "Reed" });
    const p2 = graph.addPerson({ treeId: "test-tree", firstName: "Sam", lastName: "Reed" });
    const p3 = graph.addPerson({ treeId: "test-tree", firstName: "Morgan", lastName: "Lee" });

    graph.addRelationship({
      treeId: "test-tree",
      personId1: p1.id,
      personId2: p2.id,
      type: "spouse",
    });

    graph.addRelationship({
      treeId: "test-tree",
      personId1: p1.id,
      personId2: p3.id,
      type: "former-spouse",
    });

    const activeSpouses = graph.getSpouses(p1.id, false);
    expect(activeSpouses).toHaveLength(1);
    expect(activeSpouses[0].person.id).toBe(p2.id);

    const allPartners = graph.getSpouses(p1.id, true);
    expect(allPartners).toHaveLength(2);
  });

  it("identifies full and half siblings", () => {
    // Father F, Mother M1, Mother M2
    const f = graph.addPerson({ treeId: "test-tree", firstName: "Father", lastName: "Test", gender: "male" });
    const m1 = graph.addPerson({ treeId: "test-tree", firstName: "Mother1", lastName: "Test", gender: "female" });
    const m2 = graph.addPerson({ treeId: "test-tree", firstName: "Mother2", lastName: "Test", gender: "female" });

    // Child 1 (F + M1)
    const c1 = graph.addPerson({ treeId: "test-tree", firstName: "Child1", lastName: "Test" });
    graph.addRelationship({ treeId: "test-tree", personId1: f.id, personId2: c1.id, type: "parent-child" });
    graph.addRelationship({ treeId: "test-tree", personId1: m1.id, personId2: c1.id, type: "parent-child" });

    // Child 2 (F + M1) -> Full sibling with c1
    const c2 = graph.addPerson({ treeId: "test-tree", firstName: "Child2", lastName: "Test" });
    graph.addRelationship({ treeId: "test-tree", personId1: f.id, personId2: c2.id, type: "parent-child" });
    graph.addRelationship({ treeId: "test-tree", personId1: m1.id, personId2: c2.id, type: "parent-child" });

    // Child 3 (F + M2) -> Half sibling with c1 and c2
    const c3 = graph.addPerson({ treeId: "test-tree", firstName: "Child3", lastName: "Test" });
    graph.addRelationship({ treeId: "test-tree", personId1: f.id, personId2: c3.id, type: "parent-child" });
    graph.addRelationship({ treeId: "test-tree", personId1: m2.id, personId2: c3.id, type: "parent-child" });

    const siblingsOfC1 = graph.getSiblings(c1.id);
    expect(siblingsOfC1).toHaveLength(2);

    const fullSib = siblingsOfC1.find((s) => s.person.id === c2.id);
    expect(fullSib?.type).toBe("full");

    const halfSib = siblingsOfC1.find((s) => s.person.id === c3.id);
    expect(halfSib?.type).toBe("half");
  });

  it("traverses ancestors and descendants with depth limits", () => {
    // 4 Generation Lineage: GP -> P -> C -> GC
    const gp = graph.addPerson({ treeId: "test-tree", firstName: "Grandparent", lastName: "X" });
    const p = graph.addPerson({ treeId: "test-tree", firstName: "Parent", lastName: "X" });
    const c = graph.addPerson({ treeId: "test-tree", firstName: "Child", lastName: "X" });
    const gc = graph.addPerson({ treeId: "test-tree", firstName: "Grandchild", lastName: "X" });

    graph.addRelationship({ treeId: "test-tree", personId1: gp.id, personId2: p.id, type: "parent-child" });
    graph.addRelationship({ treeId: "test-tree", personId1: p.id, personId2: c.id, type: "parent-child" });
    graph.addRelationship({ treeId: "test-tree", personId1: c.id, personId2: gc.id, type: "parent-child" });

    // Ancestors of GC with maxDepth 1 (only Parent C)
    const ancestorsDepth1 = graph.getAncestors(gc.id, 1);
    expect(ancestorsDepth1).toHaveLength(1);
    expect(ancestorsDepth1[0].person.id).toBe(c.id);

    // Ancestors of GC with maxDepth 3 (C, P, GP)
    const ancestorsDepth3 = graph.getAncestors(gc.id, 3);
    expect(ancestorsDepth3).toHaveLength(3);
    const ids = ancestorsDepth3.map((a) => a.person.id);
    expect(ids).toContain(c.id);
    expect(ids).toContain(p.id);
    expect(ids).toContain(gp.id);

    // Descendants of GP with maxDepth 2 (P, C)
    const descendantsDepth2 = graph.getDescendants(gp.id, 2);
    expect(descendantsDepth2).toHaveLength(2);
    expect(descendantsDepth2.map((d) => d.person.id)).toEqual([p.id, c.id]);
  });

  it("finds common ancestors and calculates generational distances", () => {
    // Grandparent GP
    const gp = graph.addPerson({ treeId: "test-tree", firstName: "Common", lastName: "Ancestor" });

    // Two sibling children: P1, P2
    const p1 = graph.addPerson({ treeId: "test-tree", firstName: "Parent", lastName: "One" });
    const p2 = graph.addPerson({ treeId: "test-tree", firstName: "Parent", lastName: "Two" });
    graph.addRelationship({ treeId: "test-tree", personId1: gp.id, personId2: p1.id, type: "parent-child" });
    graph.addRelationship({ treeId: "test-tree", personId1: gp.id, personId2: p2.id, type: "parent-child" });

    // Two cousins: C1 (child of P1), C2 (child of P2)
    const c1 = graph.addPerson({ treeId: "test-tree", firstName: "Cousin", lastName: "One" });
    const c2 = graph.addPerson({ treeId: "test-tree", firstName: "Cousin", lastName: "Two" });
    graph.addRelationship({ treeId: "test-tree", personId1: p1.id, personId2: c1.id, type: "parent-child" });
    graph.addRelationship({ treeId: "test-tree", personId1: p2.id, personId2: c2.id, type: "parent-child" });

    const common = graph.getCommonAncestors(c1.id, c2.id);
    expect(common).toHaveLength(1);
    expect(common[0].ancestor.id).toBe(gp.id);
    expect(common[0].distance1).toBe(2);
    expect(common[0].distance2).toBe(2);
  });

  it("finds the shortest path between distant family members via BFS", () => {
    const a = graph.addPerson({ treeId: "test-tree", firstName: "A", lastName: "User" });
    const b = graph.addPerson({ treeId: "test-tree", firstName: "B", lastName: "User" });
    const c = graph.addPerson({ treeId: "test-tree", firstName: "C", lastName: "User" });

    graph.addRelationship({ treeId: "test-tree", personId1: a.id, personId2: b.id, type: "spouse" });
    graph.addRelationship({ treeId: "test-tree", personId1: b.id, personId2: c.id, type: "parent-child" });

    const path = graph.findShortestPath(a.id, c.id);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0].from.id).toBe(a.id);
    expect(path![0].to.id).toBe(b.id);
    expect(path![1].from.id).toBe(b.id);
    expect(path![1].to.id).toBe(c.id);
  });
});
