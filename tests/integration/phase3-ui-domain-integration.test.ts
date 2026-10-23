import { describe, it, expect, beforeEach } from "vitest";
import { FamilyGraph } from "@/domain/family-graph";
import { resolveRelationship } from "@/domain/relationship-engine";
import {
  computeGenerations,
  generateTreeLayout,
  doEdgesIntersect,
  assignConflictFreeEdgeColors,
  EdgeGeometry,
} from "@/components/tree/tree-layout";
import { DEMO_PEOPLE, DEMO_RELATIONSHIPS } from "@/data/demo-data";

describe("Phase 3: UI-to-Domain Engine Integration", () => {
  let graph: FamilyGraph;

  beforeEach(() => {
    graph = new FamilyGraph("tree-sterling-chen", DEMO_PEOPLE, DEMO_RELATIONSHIPS);
  });

  it("initializes domain graph with all demo individuals and relationships", () => {
    expect(graph.getAllPeople()).toHaveLength(12);
    expect(graph.getAllRelationships()).toHaveLength(18);
  });

  it("adds a person and verifies graph state updates immediately", () => {
    const newPerson = graph.addPerson({
      treeId: "tree-sterling-chen",
      firstName: "Nathaniel",
      lastName: "Sterling",
      gender: "male",
      birthDate: "2026-04-10",
      isLiving: true,
    });

    expect(newPerson.id).toBeDefined();
    expect(graph.getAllPeople()).toHaveLength(13);
    expect(graph.getPerson(newPerson.id)?.firstName).toBe("Nathaniel");
  });

  it("adds a new relationship and updates immediate relatives and graph traversal", () => {
    // Add newborn child to Maya (person-10)
    const baby = graph.addPerson({
      treeId: "tree-sterling-chen",
      firstName: "Aria",
      lastName: "Sterling",
      gender: "female",
      isLiving: true,
    });

    const rel = graph.addRelationship({
      treeId: "tree-sterling-chen",
      personId1: "person-10", // Maya
      personId2: baby.id,
      type: "parent-child",
    });

    expect(rel.id).toBeDefined();
    expect(graph.getChildren("person-10")).toHaveLength(1);
    expect(graph.getChildren("person-10")[0].person.id).toBe(baby.id);
    expect(graph.getParents(baby.id)).toHaveLength(1);
    expect(graph.getParents(baby.id)[0].person.id).toBe("person-10");

    // Check relationship engine calculation
    const relResult = resolveRelationship(graph, "person-10", baby.id);
    expect(relResult.label).toBe("Mother");
    expect(relResult.category).toBe("parent");
  });

  it("rejects invalid relationship and prevents state corruption", () => {
    // Attempting to make Arthur (person-1) a child of Maya (person-10) -> Cycle!
    expect(() =>
      graph.addRelationship({
        treeId: "tree-sterling-chen",
        personId1: "person-10",
        personId2: "person-1",
        type: "parent-child",
      })
    ).toThrow(/ancestry cycle/i);

    // Graph relationship count must remain uncorrupted
    expect(graph.getAllRelationships()).toHaveLength(18);
  });

  it("removes a relationship and updates relative queries immediately", () => {
    // Arthur + Eleanor spouse relationship: rel-1
    expect(graph.getSpouses("person-1")).toHaveLength(1);

    const removed = graph.removeRelationship("rel-1");
    expect(removed).toBe(true);

    expect(graph.getSpouses("person-1")).toHaveLength(0);
    expect(graph.getSpouses("person-2")).toHaveLength(0);
  });

  it("deleting a person cascades and cleanly removes all connected relationships", () => {
    // Remove Julian (person-11)
    const initialRelCount = graph.getAllRelationships().length;
    expect(graph.getChildren("person-5")).toHaveLength(2); // David had Maya & Julian

    graph.removePerson("person-11");

    expect(graph.getPerson("person-11")).toBeUndefined();
    expect(graph.getChildren("person-5")).toHaveLength(1); // Only Maya remains
    expect(graph.getAllRelationships().length).toBeLessThan(initialRelCount);
  });

  it("calculates multi-generational layout automatically for all 12 demo members", () => {
    const people = graph.getAllPeople();
    const relationships = graph.getAllRelationships();

    const generations = computeGenerations(people, relationships);

    // Grandparents -> Gen 0
    expect(generations.get("person-1")).toBe(0); // Arthur
    expect(generations.get("person-2")).toBe(0); // Eleanor
    expect(generations.get("person-3")).toBe(0); // Wei
    expect(generations.get("person-4")).toBe(0); // Mei-Ling

    // Parents & Aunts/Uncles -> Gen 1
    expect(generations.get("person-5")).toBe(1); // David
    expect(generations.get("person-6")).toBe(1); // Hannah
    expect(generations.get("person-7")).toBe(1); // Claire
    expect(generations.get("person-8")).toBe(1); // Jonathan
    expect(generations.get("person-9")).toBe(1); // Marcus (aligned with spouse Jonathan)

    // Children -> Gen 2
    expect(generations.get("person-10")).toBe(2); // Maya
    expect(generations.get("person-11")).toBe(2); // Julian
    expect(generations.get("person-12")).toBe(2); // Leo

    // Layout generates person nodes, partner union nodes, and edges
    const { nodes, edges } = generateTreeLayout(people, relationships);
    const personNodes = nodes.filter((n) => n.type === "personNode");
    const unionNodes = nodes.filter((n) => n.type === "unionNode");

    expect(personNodes).toHaveLength(12);
    expect(unionNodes).toHaveLength(4); // 4 partner couples have union nodes

    // Verify children arrows originate from partner union nodes
    const davidHannahUnion = unionNodes.find(
      (u) =>
        (u.data?.spouse1Id === "person-5" && u.data?.spouse2Id === "person-6") ||
        (u.data?.spouse1Id === "person-6" && u.data?.spouse2Id === "person-5")
    );
    expect(davidHannahUnion).toBeDefined();

    // Maya's incoming parent edge should originate from David & Hannah's union node
    const mayaEdge = edges.find((e) => e.target === "person-10");
    expect(mayaEdge).toBeDefined();
    expect(mayaEdge?.source).toBe(davidHannahUnion?.id);
    expect(mayaEdge?.sourceHandle).toBe("children-source");

    // Nodes in Gen 0 should have smaller Y than nodes in Gen 2
    const arthurNode = personNodes.find((n) => n.id === "person-1")!;
    const mayaNode = personNodes.find((n) => n.id === "person-10")!;
    expect(arthurNode.position.y).toBeLessThan(mayaNode.position.y);
  });

  it("relationship finder resolves true genealogical links on the demo tree", () => {
    // Maya & Leo -> First cousins
    const resMayaLeo = resolveRelationship(graph, "person-10", "person-12");
    expect(resMayaLeo.label).toBe("First Cousin");
    expect(resMayaLeo.commonAncestors).toHaveLength(2); // Wei & Mei-Ling

    // Arthur & Maya -> Paternal Grandfather
    const resArthurMaya = resolveRelationship(graph, "person-1", "person-10");
    expect(resArthurMaya.label).toBe("Paternal Grandfather");

    // Claire & Maya -> Paternal Aunt
    const resClaireMaya = resolveRelationship(graph, "person-7", "person-10");
    expect(resClaireMaya.label).toBe("Paternal Aunt");
  });

  it("retrieves ancestors and descendants up to specified generation limits", () => {
    // Maya's ancestors
    const ancestors = graph.getAncestors("person-10");
    const ancestorIds = ancestors.map((a) => a.person.id);

    // Parents (Gen 1 from Maya)
    expect(ancestorIds).toContain("person-5"); // David
    expect(ancestorIds).toContain("person-6"); // Hannah

    // Grandparents (Gen 2 from Maya)
    expect(ancestorIds).toContain("person-1"); // Arthur
    expect(ancestorIds).toContain("person-2"); // Eleanor
    expect(ancestorIds).toContain("person-3"); // Wei
    expect(ancestorIds).toContain("person-4"); // Mei-Ling

    // Arthur's descendants
    const descendants = graph.getDescendants("person-1");
    const descendantIds = descendants.map((d) => d.person.id);

    expect(descendantIds).toContain("person-5"); // David
    expect(descendantIds).toContain("person-7"); // Claire
    expect(descendantIds).toContain("person-10"); // Maya
    expect(descendantIds).toContain("person-11"); // Julian
  });

  it("renders compact mode with tighter spacing and isCompact flag", () => {
    const regularLayout = generateTreeLayout(DEMO_PEOPLE, DEMO_RELATIONSHIPS, { isCompact: false });
    const compactLayout = generateTreeLayout(DEMO_PEOPLE, DEMO_RELATIONSHIPS, { isCompact: true });

    const regularArthur = regularLayout.nodes.find((n) => n.id === "person-1")!;
    const compactArthur = compactLayout.nodes.find((n) => n.id === "person-1")!;

    expect(compactArthur.data.isCompact).toBe(true);
    expect(regularArthur.data.isCompact).toBe(false);

    // Generation 2 nodes in compact layout should have significantly smaller Y than in regular layout
    const regularMaya = regularLayout.nodes.find((n) => n.id === "person-10")!;
    const compactMaya = compactLayout.nodes.find((n) => n.id === "person-10")!;

    expect(compactMaya.position.y).toBeLessThan(regularMaya.position.y);
  });

  it("detects geometric edge intersections and assigns distinct colors to crossing arrows", () => {
    // Vertical arrow straight down
    const verticalEdge: EdgeGeometry = {
      edgeId: "edge-v",
      sourceX: 200,
      sourceY: 100,
      targetX: 200,
      targetY: 300,
      midY: 200,
      isHighlighted: false,
      siblingIndex: 0,
    };

    // Crossing horizontal arrow passing from left to right across the vertical line at y = 200
    const crossingEdge: EdgeGeometry = {
      edgeId: "edge-h",
      sourceX: 100,
      sourceY: 150,
      targetX: 300,
      targetY: 250,
      midY: 200,
      isHighlighted: false,
      siblingIndex: 0,
    };

    // Parallel non-intersecting arrow far to the right
    const distantEdge: EdgeGeometry = {
      edgeId: "edge-distant",
      sourceX: 500,
      sourceY: 100,
      targetX: 500,
      targetY: 300,
      midY: 200,
      isHighlighted: false,
      siblingIndex: 0,
    };

    expect(doEdgesIntersect(verticalEdge, crossingEdge)).toBe(true);
    expect(doEdgesIntersect(verticalEdge, distantEdge)).toBe(false);

    // Conflict-free graph coloring must assign DIFFERENT colors to intersecting arrows
    const colorMap = assignConflictFreeEdgeColors([verticalEdge, crossingEdge, distantEdge], false);

    const colorV = colorMap.get("edge-v");
    const colorH = colorMap.get("edge-h");
    const colorDistant = colorMap.get("edge-distant");

    expect(colorV).toBeDefined();
    expect(colorH).toBeDefined();
    // THE CORE REQUIREMENT: Intersecting arrows MUST be of different colors!
    expect(colorV).not.toBe(colorH);
    expect(colorDistant).toBeDefined();
  });

  it("supports dark mode palette for edge colors", () => {
    const e1: EdgeGeometry = {
      edgeId: "e1",
      sourceX: 100,
      sourceY: 100,
      targetX: 100,
      targetY: 300,
      midY: 200,
      isHighlighted: false,
      siblingIndex: 0,
    };
    const e2: EdgeGeometry = {
      edgeId: "e2",
      sourceX: 50,
      sourceY: 150,
      targetX: 250,
      targetY: 250,
      midY: 200,
      isHighlighted: false,
      siblingIndex: 0,
    };

    const darkColorMap = assignConflictFreeEdgeColors([e1, e2], true);
    expect(darkColorMap.get("e1")).not.toBe(darkColorMap.get("e2"));
  });
});

