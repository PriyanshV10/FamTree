import { describe, it, expect, beforeEach } from "vitest";
import { LocalTreeRepository } from "@/repositories/local-tree-repository";
import { IntegrityError, NotFoundError } from "@/repositories/types";
import { Person, Relationship } from "@/domain/types";

describe("LocalTreeRepository", () => {
  let repo: LocalTreeRepository;

  beforeEach(() => {
    repo = new LocalTreeRepository();
  });

  it("lists trees with calculated member counts", async () => {
    const trees = await repo.listTrees();
    expect(trees.length).toBeGreaterThanOrEqual(2);
    const sterlingChen = trees.find((t) => t.id === "tree-sterling-chen");
    expect(sterlingChen).toBeDefined();
    expect(sterlingChen?.memberCount).toBe(12);
  });

  it("can create a new tree and retrieve it", async () => {
    const newTree = await repo.createTree({
      name: "The Windsor Dynasty",
      description: "Royal lineage",
      ownerName: "Historian",
    });

    expect(newTree.id).toBeDefined();
    expect(newTree.name).toBe("The Windsor Dynasty");
    expect(newTree.memberCount).toBe(0);

    const retrieved = await repo.getTree(newTree.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("The Windsor Dynasty");
  });

  it("batch loads an entire tree graph efficiently", async () => {
    const graphData = await repo.getTreeGraph("tree-sterling-chen");
    expect(graphData).not.toBeNull();
    expect(graphData?.tree.name).toBe("The Sterling-Chen Lineage");
    expect(graphData?.people.length).toBe(12);
    expect(graphData?.relationships.length).toBe(18);
  });

  it("adds and updates a person in a family tree", async () => {
    const newPerson: Person = {
      id: "person-new-1",
      treeId: "tree-sterling-chen",
      firstName: "Gabriel",
      lastName: "Sterling",
      gender: "male",
      isLiving: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const added = await repo.addPerson("tree-sterling-chen", newPerson);
    expect(added.firstName).toBe("Gabriel");

    const updated = await repo.updatePerson("tree-sterling-chen", "person-new-1", {
      occupation: "Astrophysicist",
    });
    expect(updated.occupation).toBe("Astrophysicist");
  });

  it("enforces referential integrity by rejecting relationships with non-existent people", async () => {
    const invalidRel: Relationship = {
      id: "rel-invalid-1",
      treeId: "tree-sterling-chen",
      personId1: "person-1",
      personId2: "ghost-person-999",
      type: "parent-child",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    await expect(repo.addRelationship("tree-sterling-chen", invalidRel)).rejects.toThrow(
      IntegrityError
    );
  });

  it("enforces referential integrity by rejecting cross-tree relationships", async () => {
    // person-1 is in tree-sterling-chen. Let's create a tree and person in tree-2
    const tree2 = await repo.createTree({ name: "Tree 2" });
    const personInTree2: Person = {
      id: "person-tree-2",
      treeId: tree2.id,
      firstName: "Alice",
      lastName: "Smith",
      gender: "female",
      isLiving: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    await repo.addPerson(tree2.id, personInTree2);

    const crossTreeRel: Relationship = {
      id: "rel-cross-tree",
      treeId: tree2.id,
      personId1: "person-1", // Belongs to tree-sterling-chen!
      personId2: "person-tree-2", // Belongs to tree2
      type: "spouse",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    await expect(repo.addRelationship(tree2.id, crossTreeRel)).rejects.toThrow(
      IntegrityError
    );
  });

  it("enforces referential integrity by rejecting self relationships", async () => {
    const selfRel: Relationship = {
      id: "rel-self",
      treeId: "tree-sterling-chen",
      personId1: "person-1",
      personId2: "person-1",
      type: "spouse",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    await expect(repo.addRelationship("tree-sterling-chen", selfRel)).rejects.toThrow(
      IntegrityError
    );
  });

  it("cascades deletion of relationships when a person is removed", async () => {
    const graphBefore = await repo.getTreeGraph("tree-sterling-chen");
    const relsWithPerson1 = graphBefore!.relationships.filter(
      (r) => r.personId1 === "person-1" || r.personId2 === "person-1"
    );
    expect(relsWithPerson1.length).toBeGreaterThan(0);

    await repo.removePerson("tree-sterling-chen", "person-1");

    const graphAfter = await repo.getTreeGraph("tree-sterling-chen");
    expect(graphAfter!.people.some((p) => p.id === "person-1")).toBe(false);

    const relsWithPerson1After = graphAfter!.relationships.filter(
      (r) => r.personId1 === "person-1" || r.personId2 === "person-1"
    );
    expect(relsWithPerson1After.length).toBe(0);
  });

  it("cascades deletion of people and relationships when an entire tree is deleted", async () => {
    await repo.deleteTree("tree-sterling-chen");
    const graph = await repo.getTreeGraph("tree-sterling-chen");
    expect(graph).toBeNull();

    await expect(repo.deleteTree("tree-nonexistent")).rejects.toThrow(NotFoundError);
  });
});
