import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { duplicateTreeToAccount } from "@/lib/tree-clone";
import { getTreeRepository, resetRepositoryInstance } from "@/repositories";
import { FamilyTree, Person, Relationship } from "@/types";
import { saveReferencePersonConfig, getReferencePersonConfig } from "@/lib/reference-person";
import { saveSiblingOrder, getSiblingOrder } from "@/lib/sibling-order";
import { saveSpouseOrder, getSpouseOrder, swapSpousesInOrder } from "@/lib/spouse-order";

const mockStorage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, val: string) => {
    mockStorage.set(key, val);
  },
  removeItem: (key: string) => {
    mockStorage.delete(key);
  },
  clear: () => {
    mockStorage.clear();
  },
  get length() {
    return mockStorage.size;
  },
  key: (index: number) => Array.from(mockStorage.keys())[index] || null,
};

describe("duplicateTreeToAccount (Tree Sharing & Cloned Editing)", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: {
        dispatchEvent: () => true,
        localStorage: localStorageMock,
      },
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    mockStorage.clear();
    resetRepositoryInstance();
  });

  const sampleTree: FamilyTree = {
    id: "tree-orig-1",
    name: "Original Royal Family",
    description: "Curated lineage",
    ownerName: "Alice Curator",
    ownerId: "user-alice",
    coverColor: "bg-emerald-800",
    isDefault: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const samplePeople: Person[] = [
    {
      id: "p1",
      treeId: "tree-orig-1",
      firstName: "George",
      lastName: "Windsor",
      gender: "male",
      isLiving: false,
      birthDate: "1895-12-14",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p2",
      treeId: "tree-orig-1",
      firstName: "Elizabeth",
      lastName: "Bowes-Lyon",
      gender: "female",
      isLiving: false,
      birthDate: "1900-08-04",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p3",
      treeId: "tree-orig-1",
      firstName: "Elizabeth",
      lastName: "II",
      gender: "female",
      isLiving: false,
      birthDate: "1926-04-21",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const sampleRelationships: Relationship[] = [
    {
      id: "r1",
      treeId: "tree-orig-1",
      personId1: "p1",
      personId2: "p2",
      type: "spouse",
      startDate: "1923-04-26",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "r2",
      treeId: "tree-orig-1",
      personId1: "p1",
      personId2: "p3",
      type: "parent-child",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "r3",
      treeId: "tree-orig-1",
      personId1: "p2",
      personId2: "p3",
      type: "parent-child",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  it("duplicates tree to editor account with new unique IDs and correct ownership", async () => {
    // Set up configs on original tree
    saveReferencePersonConfig(sampleTree.id, {
      personId: "p3",
      baseGeneration: 0,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    saveSiblingOrder(sampleTree.id, { "p1-p2": ["p3"] });
    saveSpouseOrder(sampleTree.id, { p1: ["p2"] });

    // Execute duplication for editor user 'bob-editor'
    const clonedTree = await duplicateTreeToAccount({
      tree: sampleTree,
      people: samplePeople,
      relationships: sampleRelationships,
      ownerId: "user-bob",
      ownerName: "Bob Editor",
      customTreeName: "Bob's Cloned Royal Family",
    });

    expect(clonedTree.id).toBeDefined();
    expect(clonedTree.id).not.toBe(sampleTree.id);
    expect(clonedTree.name).toBe("Bob's Cloned Royal Family");
    expect(clonedTree.ownerId).toBe("user-bob");
    expect(clonedTree.ownerName).toBe("Bob Editor");

    // Verify cloned members in repository
    const repo = getTreeRepository();
    const clonedGraph = await repo.getTreeGraph(clonedTree.id);
    expect(clonedGraph).toBeDefined();
    expect(clonedGraph!.people).toHaveLength(3);
    expect(clonedGraph!.relationships).toHaveLength(3);

    // Verify all people have new IDs under cloned tree
    for (const p of clonedGraph!.people) {
      expect(p.treeId).toBe(clonedTree.id);
      expect(["p1", "p2", "p3"]).not.toContain(p.id);
    }

    // Verify relationships were mapped to the new person IDs
    const clonedP3 = clonedGraph!.people.find((p) => p.firstName === "Elizabeth" && p.lastName === "II")!;
    const clonedP1 = clonedGraph!.people.find((p) => p.firstName === "George")!;
    const clonedP2 = clonedGraph!.people.find((p) => p.firstName === "Elizabeth" && p.lastName === "Bowes-Lyon")!;

    expect(clonedP3).toBeDefined();
    expect(clonedP1).toBeDefined();
    expect(clonedP2).toBeDefined();

    const clonedParentRel = clonedGraph!.relationships.find(
      (r) => r.personId1 === clonedP1.id && r.personId2 === clonedP3.id
    );
    expect(clonedParentRel).toBeDefined();
    expect(clonedParentRel!.type).toBe("parent-child");

    const clonedSpouseRel = clonedGraph!.relationships.find(
      (r) => r.personId1 === clonedP1.id && r.personId2 === clonedP2.id
    );
    expect(clonedSpouseRel).toBeDefined();
    expect(clonedSpouseRel!.type).toBe("spouse");
    expect(clonedSpouseRel!.startDate).toBe("1923-04-26");

    // Verify reference person config was cloned and points to the new person ID
    const clonedRefConfig = getReferencePersonConfig(clonedTree.id, clonedGraph!.people);
    expect(clonedRefConfig).toBeDefined();
    expect(clonedRefConfig!.personId).toBe(clonedP3.id);

    // Verify original tree reference config is untouched
    const origRefConfig = getReferencePersonConfig(sampleTree.id, samplePeople);
    expect(origRefConfig!.personId).toBe("p3");
  });

  it("duplicates sibling and spouse orders mapping them to cloned IDs", async () => {
    saveSiblingOrder(sampleTree.id, { "p1-p2": ["p3"] });
    saveSpouseOrder(sampleTree.id, { p1: ["p2"] });

    const clonedTree = await duplicateTreeToAccount({
      tree: sampleTree,
      people: samplePeople,
      relationships: sampleRelationships,
      ownerId: "user-charlie",
      ownerName: "Charlie",
    });

    const repo = getTreeRepository();
    const clonedGraph = await repo.getTreeGraph(clonedTree.id);
    const clonedP1 = clonedGraph!.people.find((p) => p.firstName === "George")!;
    const clonedP2 = clonedGraph!.people.find((p) => p.lastName === "Bowes-Lyon")!;
    const clonedP3 = clonedGraph!.people.find((p) => p.lastName === "II")!;

    const clonedSpouseOrder = getSpouseOrder(clonedTree.id);
    expect(clonedSpouseOrder[clonedP1.id]).toEqual([clonedP2.id]);

    const clonedSiblingOrder = getSiblingOrder(clonedTree.id);
    // Sibling order includes mapped IDs
    const values = Object.values(clonedSiblingOrder).flat();
    expect(values).toContain(clonedP3.id);
  });

  it("duplicates canonical couple pair spouse keys created with swapSpousesInOrder", async () => {
    // Generate canonical pair key using swapSpousesInOrder
    const swapped = swapSpousesInOrder(sampleTree.id, "p1", "p2");
    saveSpouseOrder(sampleTree.id, swapped);

    const clonedTree = await duplicateTreeToAccount({
      tree: sampleTree,
      people: samplePeople,
      relationships: sampleRelationships,
      ownerId: "user-dan",
      ownerName: "Dan",
    });

    const repo = getTreeRepository();
    const clonedGraph = await repo.getTreeGraph(clonedTree.id);
    const clonedP1 = clonedGraph!.people.find((p) => p.firstName === "George")!;
    const clonedP2 = clonedGraph!.people.find((p) => p.lastName === "Bowes-Lyon")!;

    const clonedSpouseOrder = getSpouseOrder(clonedTree.id);
    const expectedPairKey = [clonedP1.id, clonedP2.id].sort().join("___");
    expect(clonedSpouseOrder[expectedPairKey]).toEqual([clonedP2.id, clonedP1.id]);
  });
});
