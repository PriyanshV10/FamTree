import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  getReferencePersonConfig,
  saveReferencePersonConfig,
  resetReferencePersonConfig,
  ReferencePersonConfig,
} from "@/lib/reference-person";
import { computeGenerations, generateTreeLayout } from "@/components/tree/tree-layout";
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

describe("Reference Person & Generation Anchor Engine", () => {
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
    treeId: "tree-ref-1",
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
    treeId: "tree-ref-1",
    personId1,
    personId2,
    type,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  it("auto-selects first person in tree as default reference person", () => {
    const people = [
      createPerson({ id: "p1", firstName: "Alice", lastName: "Smith" }),
      createPerson({ id: "p2", firstName: "Bob", lastName: "Smith" }),
    ];

    const config = getReferencePersonConfig("tree-ref-1", people);
    expect(config).not.toBeNull();
    expect(config?.personId).toBe("p1");
    expect(config?.baseGeneration).toBe(0);
  });

  it("persists and restores reference person config in localStorage", () => {
    const people = [
      createPerson({ id: "p1", firstName: "Alice", lastName: "Smith" }),
      createPerson({ id: "p2", firstName: "Bob", lastName: "Smith" }),
    ];

    const newConfig: ReferencePersonConfig = {
      personId: "p2",
      baseGeneration: 1,
      updatedAt: new Date().toISOString(),
    };
    saveReferencePersonConfig("tree-ref-1", newConfig);

    const loaded = getReferencePersonConfig("tree-ref-1", people);
    expect(loaded?.personId).toBe("p2");
    expect(loaded?.baseGeneration).toBe(1);

    resetReferencePersonConfig("tree-ref-1");
    const afterReset = getReferencePersonConfig("tree-ref-1", people);
    expect(afterReset?.personId).toBe("p1");
  });

  it("anchors generation computation to the reference person and computes children (+1) and spouse (0)", () => {
    const self = createPerson({ id: "self", firstName: "Me", lastName: "User" });
    const spouse = createPerson({ id: "spouse", firstName: "Spouse", lastName: "User" });
    const child1 = createPerson({ id: "child1", firstName: "Kid", lastName: "One" });
    const child2 = createPerson({ id: "child2", firstName: "Kid", lastName: "Two" });

    const people = [self, spouse, child1, child2];
    const relationships: Relationship[] = [
      createRel("r-sp", self.id, spouse.id, "spouse"),
      createRel("r-c1", self.id, child1.id, "parent-child"),
      createRel("r-c2", self.id, child2.id, "parent-child"),
    ];

    const config: ReferencePersonConfig = {
      personId: "self",
      baseGeneration: 0,
    };

    const gens = computeGenerations(people, relationships, config);
    expect(gens.get("self")).toBe(0);
    expect(gens.get("spouse")).toBe(0);
    expect(gens.get("child1")).toBe(1);
    expect(gens.get("child2")).toBe(1);
  });

  it("does NOT disrupt or push existing generation numbers when adding an ancestor/parent", () => {
    const self = createPerson({ id: "self", firstName: "Me", lastName: "User" });
    const child = createPerson({ id: "child", firstName: "Kid", lastName: "User" });

    const peopleBefore = [self, child];
    const relsBefore = [createRel("r1", self.id, child.id, "parent-child")];

    const config: ReferencePersonConfig = {
      personId: "self",
      baseGeneration: 0,
    };

    const gensBefore = computeGenerations(peopleBefore, relsBefore, config);
    expect(gensBefore.get("self")).toBe(0);
    expect(gensBefore.get("child")).toBe(1);

    // NOW ADD PARENT & GRANDPARENT ABOVE SELF
    const parent = createPerson({ id: "parent", firstName: "Mom", lastName: "User" });
    const grandparent = createPerson({ id: "grandparent", firstName: "Grandma", lastName: "User" });

    const peopleAfter = [self, child, parent, grandparent];
    const relsAfter = [
      createRel("r1", self.id, child.id, "parent-child"),
      createRel("r2", parent.id, self.id, "parent-child"),
      createRel("r3", grandparent.id, parent.id, "parent-child"),
    ];

    const gensAfter = computeGenerations(peopleAfter, relsAfter, config);

    // CRITICAL: self and child generations MUST REMAIN UNCHANGED (0 and 1)
    expect(gensAfter.get("self")).toBe(0);
    expect(gensAfter.get("child")).toBe(1);

    // Ancestors get negative generations relative to self
    expect(gensAfter.get("parent")).toBe(-1);
    expect(gensAfter.get("grandparent")).toBe(-2);
  });

  it("allows changing the reference person to re-anchor the generational perspective", () => {
    const grandmom = createPerson({ id: "gm", firstName: "Grandma", lastName: "Smith" });
    const mom = createPerson({ id: "mom", firstName: "Mom", lastName: "Smith" });
    const me = createPerson({ id: "me", firstName: "Me", lastName: "Smith" });

    const people = [me, mom, grandmom];
    const relationships = [
      createRel("r1", grandmom.id, mom.id, "parent-child"),
      createRel("r2", mom.id, me.id, "parent-child"),
    ];

    // Anchored at Me: Me is 0, Mom is -1, Grandma is -2
    const configMe: ReferencePersonConfig = { personId: "me", baseGeneration: 0 };
    const gensMe = computeGenerations(people, relationships, configMe);
    expect(gensMe.get("me")).toBe(0);
    expect(gensMe.get("mom")).toBe(-1);
    expect(gensMe.get("gm")).toBe(-2);

    // Now change anchor to Grandma: Grandma is 0, Mom is 1, Me is 2
    const configGm: ReferencePersonConfig = { personId: "gm", baseGeneration: 0 };
    const gensGm = computeGenerations(people, relationships, configGm);
    expect(gensGm.get("gm")).toBe(0);
    expect(gensGm.get("mom")).toBe(1);
    expect(gensGm.get("me")).toBe(2);
  });

  it("passes reference person metadata to layout nodes in generateTreeLayout", () => {
    const p1 = createPerson({ id: "p1", firstName: "John", lastName: "Doe" });
    const p2 = createPerson({ id: "p2", firstName: "Jane", lastName: "Doe" });
    const rel = createRel("r1", p1.id, p2.id, "parent-child");

    const config: ReferencePersonConfig = { personId: "p1", baseGeneration: 0 };
    const layout = generateTreeLayout(
      [p1, p2],
      [rel],
      { referencePersonConfig: config }
    );

    const node1 = layout.nodes.find((n) => n.id === "p1");
    const node2 = layout.nodes.find((n) => n.id === "p2");

    expect(node1?.data).toHaveProperty("isReferencePerson", true);
    expect(node1?.data).toHaveProperty("generation", 0);

    expect(node2?.data).toHaveProperty("isReferencePerson", false);
    expect(node2?.data).toHaveProperty("generation", 1);
  });
});
