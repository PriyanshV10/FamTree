import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  getSiblingOrder,
  saveSiblingOrder,
  resetSiblingOrder,
  getSubtreeNodeIds,
  getSiblingContext,
} from "@/lib/sibling-order";
import { generateTreeLayout } from "@/components/tree/tree-layout";
import { Person, Relationship } from "@/types";

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

describe("Sibling Order & Descendant Subtree Engine", () => {
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
  });

  const createPerson = (
    p: Partial<Person> & Pick<Person, "id" | "firstName" | "lastName">
  ): Person => ({
    treeId: "t1",
    gender: "other",
    isLiving: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...p,
  });

  const createRel = (
    r: Partial<Relationship> & Pick<Relationship, "id" | "personId1" | "personId2" | "type">
  ): Relationship => ({
    treeId: "t1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...r,
  });

  describe("LocalStorage Persistence", () => {
    it("returns empty object when no sibling order stored", () => {
      const order = getSiblingOrder("tree-123");
      expect(order).toEqual({});
    });

    it("saves and retrieves custom sibling order per treeId", () => {
      const customOrder = {
        "dad___mom": ["child-2", "child-1"],
      };
      saveSiblingOrder("tree-123", customOrder);

      expect(getSiblingOrder("tree-123")).toEqual(customOrder);
      expect(getSiblingOrder("tree-other")).toEqual({});
    });

    it("resets sibling order for a specific tree", () => {
      saveSiblingOrder("tree-123", { "dad___mom": ["child-2", "child-1"] });
      resetSiblingOrder("tree-123");
      expect(getSiblingOrder("tree-123")).toEqual({});
    });
  });

  describe("getSubtreeNodeIds", () => {
    const relationships: Relationship[] = [
      createRel({ id: "r1", personId1: "grandpa", personId2: "grandma", type: "spouse" }),
      createRel({ id: "r2", personId1: "grandpa", personId2: "dad", type: "parent-child" }),
      createRel({ id: "r3", personId1: "grandma", personId2: "dad", type: "parent-child" }),
      createRel({ id: "r4", personId1: "grandpa", personId2: "aunt", type: "parent-child" }),
      createRel({ id: "r5", personId1: "grandma", personId2: "aunt", type: "parent-child" }),
      createRel({ id: "r6", personId1: "dad", personId2: "mom", type: "spouse" }),
      createRel({ id: "r7", personId1: "dad", personId2: "kid1", type: "parent-child" }),
      createRel({ id: "r8", personId1: "mom", personId2: "kid1", type: "parent-child" }),
      createRel({ id: "r9", personId1: "dad", personId2: "kid2", type: "parent-child" }),
      createRel({ id: "r10", personId1: "mom", personId2: "kid2", type: "parent-child" }),
      createRel({ id: "r11", personId1: "kid1", personId2: "grandkid", type: "parent-child" }),
    ];

    const nodes = [
      { id: "grandpa", type: "personNode" },
      { id: "grandma", type: "personNode" },
      { id: "union-grandpa-grandma", type: "unionNode", data: { spouse1Id: "grandpa", spouse2Id: "grandma" } },
      { id: "dad", type: "personNode" },
      { id: "mom", type: "personNode" },
      { id: "union-dad-mom", type: "unionNode", data: { spouse1Id: "dad", spouse2Id: "mom" } },
      { id: "aunt", type: "personNode" },
      { id: "kid1", type: "personNode" },
      { id: "kid2", type: "personNode" },
      { id: "grandkid", type: "personNode" },
    ];

    it("extracts entire branch when dragging dad: includes dad, mom, union, kids, grandkid, but excludes grandpa, grandma, and aunt", () => {
      const subtree = getSubtreeNodeIds("dad", relationships, nodes);
      expect(subtree.has("dad")).toBe(true);
      expect(subtree.has("mom")).toBe(true);
      expect(subtree.has("union-dad-mom")).toBe(true);
      expect(subtree.has("kid1")).toBe(true);
      expect(subtree.has("kid2")).toBe(true);
      expect(subtree.has("grandkid")).toBe(true);

      // Ancestors and aunts must NOT be included
      expect(subtree.has("grandpa")).toBe(false);
      expect(subtree.has("grandma")).toBe(false);
      expect(subtree.has("union-grandpa-grandma")).toBe(false);
      expect(subtree.has("aunt")).toBe(false);
    });

    it("extracts only kid2 when kid2 has no spouse or children", () => {
      const subtree = getSubtreeNodeIds("kid2", relationships, nodes);
      expect(subtree.size).toBe(1);
      expect(subtree.has("kid2")).toBe(true);
    });
  });

  describe("getSiblingContext", () => {
    const people: Person[] = [
      createPerson({ id: "dad", firstName: "Dad", lastName: "Smith", gender: "male" }),
      createPerson({ id: "mom", firstName: "Mom", lastName: "Smith", gender: "female" }),
      createPerson({ id: "child1", firstName: "Child 1", lastName: "Smith", gender: "male" }),
      createPerson({ id: "child2", firstName: "Child 2", lastName: "Smith", gender: "female" }),
      createPerson({ id: "child3", firstName: "Child 3", lastName: "Smith", gender: "male" }),
      createPerson({ id: "spouse2", firstName: "Spouse 2", lastName: "Jones", gender: "male" }),
    ];

    const relationships: Relationship[] = [
      createRel({ id: "r1", personId1: "dad", personId2: "mom", type: "spouse" }),
      createRel({ id: "r2", personId1: "dad", personId2: "child1", type: "parent-child" }),
      createRel({ id: "r3", personId1: "mom", personId2: "child1", type: "parent-child" }),
      createRel({ id: "r4", personId1: "dad", personId2: "child2", type: "parent-child" }),
      createRel({ id: "r5", personId1: "mom", personId2: "child2", type: "parent-child" }),
      createRel({ id: "r6", personId1: "dad", personId2: "child3", type: "parent-child" }),
      createRel({ id: "r7", personId1: "mom", personId2: "child3", type: "parent-child" }),
      createRel({ id: "r8", personId1: "child2", personId2: "spouse2", type: "spouse" }),
    ];

    it("identifies sibling group sharing parents", () => {
      const ctx = getSiblingContext("child1", people, relationships);
      expect(ctx).not.toBeNull();
      expect(ctx!.parentKey).toBe("dad___mom");
      expect(ctx!.siblingIds.sort()).toEqual(["child1", "child2", "child3"]);
    });

    it("resolves in-law spouse without parents to the partner's sibling group", () => {
      const ctx = getSiblingContext("spouse2", people, relationships);
      expect(ctx).not.toBeNull();
      expect(ctx!.parentKey).toBe("dad___mom");
      expect(ctx!.siblingIds.sort()).toEqual(["child1", "child2", "child3"]);
    });

    it("identifies root generation group for people without parents", () => {
      const ctx = getSiblingContext("dad", people, relationships);
      expect(ctx).not.toBeNull();
      expect(ctx!.parentKey).toBe("root");
    });
  });

  describe("generateTreeLayout with Sibling Order", () => {
    const people: Person[] = [
      createPerson({ id: "dad", firstName: "Dad", lastName: "Smith", gender: "male", birthDate: "1960-01-01" }),
      createPerson({ id: "mom", firstName: "Mom", lastName: "Smith", gender: "female", birthDate: "1962-01-01" }),
      createPerson({ id: "c1", firstName: "Child 1", lastName: "Smith", gender: "female", birthDate: "1990-01-01" }),
      createPerson({ id: "c2", firstName: "Child 2", lastName: "Smith", gender: "male", birthDate: "1995-01-01" }),
      createPerson({ id: "c3", firstName: "Child 3", lastName: "Smith", gender: "female", birthDate: "1998-01-01" }),
    ];

    const relationships: Relationship[] = [
      createRel({ id: "r1", personId1: "dad", personId2: "mom", type: "spouse" }),
      createRel({ id: "r2", personId1: "dad", personId2: "c1", type: "parent-child" }),
      createRel({ id: "r3", personId1: "mom", personId2: "c1", type: "parent-child" }),
      createRel({ id: "r4", personId1: "dad", personId2: "c2", type: "parent-child" }),
      createRel({ id: "r5", personId1: "mom", personId2: "c2", type: "parent-child" }),
      createRel({ id: "r6", personId1: "dad", personId2: "c3", type: "parent-child" }),
      createRel({ id: "r7", personId1: "mom", personId2: "c3", type: "parent-child" }),
    ];

    it("lays out children in default chronological birthdate order when no custom order is specified", () => {
      const layout = generateTreeLayout(people, relationships);
      const c1Node = layout.nodes.find((n) => n.id === "c1")!;
      const c2Node = layout.nodes.find((n) => n.id === "c2")!;
      const c3Node = layout.nodes.find((n) => n.id === "c3")!;

      expect(c1Node.position.x).toBeLessThan(c2Node.position.x);
      expect(c2Node.position.x).toBeLessThan(c3Node.position.x);
    });

    it("reorders children when custom siblingOrder is specified", () => {
      // Reorder: Child 3, Child 1, Child 2
      const customSiblingOrder = {
        "dad___mom": ["c3", "c1", "c2"],
      };

      const layout = generateTreeLayout(people, relationships, {
        siblingOrder: customSiblingOrder,
      });

      const c1Node = layout.nodes.find((n) => n.id === "c1")!;
      const c2Node = layout.nodes.find((n) => n.id === "c2")!;
      const c3Node = layout.nodes.find((n) => n.id === "c3")!;

      expect(c3Node.position.x).toBeLessThan(c1Node.position.x);
      expect(c1Node.position.x).toBeLessThan(c2Node.position.x);
    });
  });
});
