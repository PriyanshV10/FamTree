import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  getSpouseOrder,
  swapSpousesInOrder,
  resetSpouseOrder,
} from "@/lib/spouse-order";
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

describe("Spouse Order & Red Dot Swap Engine", () => {
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
    treeId: "tree-spouse-1",
    gender: "other",
    isLiving: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...p,
  });

  const createRel = (
    id: string,
    personId1: string,
    personId2: string,
    type: "parent-child" | "spouse"
  ): Relationship => ({
    id,
    treeId: "tree-spouse-1",
    personId1,
    personId2,
    type,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  it("stores and toggles spouse swap in localStorage", () => {
    const treeId = "test-tree";
    expect(getSpouseOrder(treeId)).toEqual({});

    // First swap: Alice & Bob -> [Bob, Alice]
    const order1 = swapSpousesInOrder(treeId, "p1", "p2");
    expect(order1["p1___p2"]).toEqual(["p2", "p1"]);

    const reloaded = getSpouseOrder(treeId);
    expect(reloaded["p1___p2"]).toEqual(["p2", "p1"]);

    // Second swap: toggle back -> [Alice, Bob]
    const order2 = swapSpousesInOrder(treeId, "p1", "p2", order1);
    expect(order2["p1___p2"]).toEqual(["p1", "p2"]);

    // Reset
    resetSpouseOrder(treeId);
    expect(getSpouseOrder(treeId)).toEqual({});
  });

  it("swaps horizontal layout positions of spouses in generateTreeLayout", () => {
    const p1 = createPerson({ id: "p1", firstName: "Alice", lastName: "Smith" });
    const p2 = createPerson({ id: "p2", firstName: "Bob", lastName: "Smith" });
    const rel = createRel("r1", p1.id, p2.id, "spouse");

    // Default layout without swap
    const layoutDefault = generateTreeLayout([p1, p2], [rel]);
    const nodeP1Default = layoutDefault.nodes.find((n) => n.id === "p1")!;
    const nodeP2Default = layoutDefault.nodes.find((n) => n.id === "p2")!;
    const unionDefault = layoutDefault.nodes.find((n) => n.id === "union-p1___p2")!;

    expect(nodeP1Default.position.x).toBeLessThan(nodeP2Default.position.x);
    expect(unionDefault.position.x).toBeGreaterThan(nodeP1Default.position.x);
    expect(unionDefault.position.x).toBeLessThan(nodeP2Default.position.x);

    // Swapped layout: p2 on left, p1 on right
    const layoutSwapped = generateTreeLayout([p1, p2], [rel], {
      spouseOrder: { "p1___p2": ["p2", "p1"] },
    });
    const nodeP1Swapped = layoutSwapped.nodes.find((n) => n.id === "p1")!;
    const nodeP2Swapped = layoutSwapped.nodes.find((n) => n.id === "p2")!;
    const unionSwapped = layoutSwapped.nodes.find((n) => n.id === "union-p1___p2")!;

    expect(nodeP2Swapped.position.x).toBeLessThan(nodeP1Swapped.position.x);
    expect(unionSwapped.position.x).toBeGreaterThan(nodeP2Swapped.position.x);
    expect(unionSwapped.position.x).toBeLessThan(nodeP1Swapped.position.x);
  });

  it("maintains children centered below union node when spouses are swapped", () => {
    const p1 = createPerson({ id: "p1", firstName: "Parent1", lastName: "Fam" });
    const p2 = createPerson({ id: "p2", firstName: "Parent2", lastName: "Fam" });
    const child = createPerson({ id: "c1", firstName: "Child", lastName: "Fam" });

    const relSpouse = createRel("r-sp", p1.id, p2.id, "spouse");
    const relChild1 = createRel("r-c1", p1.id, child.id, "parent-child");
    const relChild2 = createRel("r-c2", p2.id, child.id, "parent-child");

    const layoutNormal = generateTreeLayout(
      [p1, p2, child],
      [relSpouse, relChild1, relChild2]
    );
    const childNormal = layoutNormal.nodes.find((n) => n.id === "c1")!;

    const layoutSwapped = generateTreeLayout(
      [p1, p2, child],
      [relSpouse, relChild1, relChild2],
      { spouseOrder: { "p1___p2": ["p2", "p1"] } }
    );
    const childSwapped = layoutSwapped.nodes.find((n) => n.id === "c1")!;

    // Child position remains centered and stable
    expect(childSwapped.position.x).toEqual(childNormal.position.x);
  });

  it("passes onSwapSpouses callback to unionNode data", () => {
    const p1 = createPerson({ id: "p1", firstName: "Alice", lastName: "Smith" });
    const p2 = createPerson({ id: "p2", firstName: "Bob", lastName: "Smith" });
    const rel = createRel("r1", p1.id, p2.id, "spouse");

    let swappedArgs: [string, string] | null = null;
    const handleSwap = (s1: string, s2: string) => {
      swappedArgs = [s1, s2];
    };

    const layout = generateTreeLayout([p1, p2], [rel], {
      onSwapSpouses: handleSwap,
    });

    const unionNode = layout.nodes.find((n) => n.id === "union-p1___p2");
    expect(unionNode).toBeDefined();

    const unionData = unionNode?.data as {
      onSwapSpouses?: (a: string, b: string) => void;
      spouse1Id: string;
      spouse2Id: string;
    };

    expect(typeof unionData.onSwapSpouses).toBe("function");
    unionData.onSwapSpouses!(unionData.spouse1Id, unionData.spouse2Id);
    expect(swappedArgs).toEqual(["p1", "p2"]);
  });
});
