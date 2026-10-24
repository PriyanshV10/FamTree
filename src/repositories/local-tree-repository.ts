import { FamilyTree, Person, Relationship } from "@/domain/types";
import {
  ITreeRepository,
  TreeGraphData,
  NotFoundError,
  IntegrityError,
} from "./types";
import { DEMO_TREES, DEMO_PEOPLE, DEMO_RELATIONSHIPS } from "@/data/demo-data";
import { createId, getCurrentTimestamp } from "@/lib/utils";

const STORAGE_KEY_TREES = "famtree:trees:v1";
const STORAGE_KEY_PEOPLE = "famtree:people:v1";
const STORAGE_KEY_RELATIONSHIPS = "famtree:relationships:v1";

export class LocalTreeRepository implements ITreeRepository {
  private trees: Map<string, FamilyTree> = new Map();
  private people: Map<string, Person> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    this.loadInitialData();
  }

  private loadInitialData(): void {
    if (this.isBrowser) {
      try {
        const storedTrees = window.localStorage.getItem(STORAGE_KEY_TREES);
        const storedPeople = window.localStorage.getItem(STORAGE_KEY_PEOPLE);
        const storedRels = window.localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);

        if (storedTrees && storedPeople && storedRels) {
          const treesArr: FamilyTree[] = JSON.parse(storedTrees);
          const peopleArr: Person[] = JSON.parse(storedPeople);
          const relsArr: Relationship[] = JSON.parse(storedRels);

          this.trees.clear();
          this.people.clear();
          this.relationships.clear();

          treesArr.forEach((t) => this.trees.set(t.id, t));
          peopleArr.forEach((p) => this.people.set(p.id, p));
          relsArr.forEach((r) => this.relationships.set(r.id, r));
          return;
        }
      } catch (err) {
        console.warn("Failed to load local storage family data, falling back to seed:", err);
      }
    }

    // Fallback or Initial Seed (only populate if empty)
    if (this.trees.size === 0) {
      this.trees.clear();
      this.people.clear();
      this.relationships.clear();
      DEMO_TREES.forEach((t) => this.trees.set(t.id, { ...t }));
      DEMO_PEOPLE.forEach((p) => this.people.set(p.id, { ...p }));
      DEMO_RELATIONSHIPS.forEach((r) => this.relationships.set(r.id, { ...r }));
      this.persist();
    }
  }

  private persist(): void {
    if (!this.isBrowser) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY_TREES,
        JSON.stringify(Array.from(this.trees.values()))
      );
      window.localStorage.setItem(
        STORAGE_KEY_PEOPLE,
        JSON.stringify(Array.from(this.people.values()))
      );
      window.localStorage.setItem(
        STORAGE_KEY_RELATIONSHIPS,
        JSON.stringify(Array.from(this.relationships.values()))
      );
    } catch (err) {
      console.error("Failed to persist family tree data to localStorage:", err);
    }
  }

  async listTrees(userId?: string): Promise<FamilyTree[]> {
    this.loadInitialData();
    let list = Array.from(this.trees.values());

    let currentUserId: string | null = userId ?? null;
    if (!currentUserId && typeof window !== "undefined") {
      try {
        currentUserId = window.localStorage.getItem("famtree_auth_user_id");
      } catch {
        // ignore
      }
    }

    list = list.filter((t) => {
      // 1. Starter demo trees are always visible to everyone
      if (t.isDefault) return true;

      // 2. If logged in with currentUserId:
      if (currentUserId) {
        return (
          !t.ownerId ||
          t.ownerId === currentUserId ||
          t.ownerId === "guest" ||
          t.ownerId === "local-curator"
        );
      }

      // 3. If unauthenticated / guest:
      // Do not display trees owned by a specific logged-in user account
      if (t.ownerId && t.ownerId !== "guest" && t.ownerId !== "local-curator") {
        return false;
      }

      return true;
    });

    // Recalculate member counts dynamically
    return list.map((t) => {
      const memberCount = Array.from(this.people.values()).filter(
        (p) => p.treeId === t.id
      ).length;
      return {
        ...t,
        memberCount,
      };
    });
  }

  async getTree(id: string): Promise<FamilyTree | null> {
    this.loadInitialData();
    const tree = this.trees.get(id);
    if (!tree) return null;
    const memberCount = Array.from(this.people.values()).filter(
      (p) => p.treeId === tree.id
    ).length;
    return { ...tree, memberCount };
  }

  async createTree(input: {
    id?: string;
    name: string;
    description?: string;
    ownerName?: string;
    ownerId?: string;
    coverColor?: string;
  }): Promise<FamilyTree> {
    const now = getCurrentTimestamp();
    const tree: FamilyTree = {
      id: input.id || createId("tree"),
      name: input.name,
      description: input.description || "",
      ownerName: input.ownerName || "Tree Curator",
      ownerId: input.ownerId,
      coverColor: input.coverColor || "bg-emerald-800",
      createdAt: now,
      updatedAt: now,
      isDefault: false,
      memberCount: 0,
      generationCount: 1,
    };
    this.trees.set(tree.id, tree);
    this.persist();
    return tree;
  }

  async updateTree(id: string, updates: Partial<FamilyTree>): Promise<FamilyTree> {
    const existing = this.trees.get(id);
    if (!existing) {
      throw new NotFoundError(`Family tree '${id}' not found`);
    }
    const updated: FamilyTree = {
      ...existing,
      ...updates,
      updatedAt: getCurrentTimestamp(),
    };
    this.trees.set(id, updated);
    this.persist();
    return updated;
  }

  async deleteTree(id: string): Promise<void> {
    if (!this.trees.has(id)) {
      throw new NotFoundError(`Family tree '${id}' not found`);
    }
    this.trees.delete(id);

    // Cascade deletion of people and relationships
    for (const [pId, person] of this.people.entries()) {
      if (person.treeId === id) {
        this.people.delete(pId);
      }
    }
    for (const [rId, rel] of this.relationships.entries()) {
      if (rel.treeId === id) {
        this.relationships.delete(rId);
      }
    }
    this.persist();
  }

  async getTreeGraph(treeId: string): Promise<TreeGraphData | null> {
    const tree = await this.getTree(treeId);
    if (!tree) return null;

    const people = Array.from(this.people.values()).filter(
      (p) => p.treeId === treeId
    );
    const relationships = Array.from(this.relationships.values()).filter(
      (r) => r.treeId === treeId
    );

    return {
      tree,
      people,
      relationships,
    };
  }

  async addPerson(treeId: string, person: Person): Promise<Person> {
    if (!this.trees.has(treeId)) {
      throw new NotFoundError(`Tree '${treeId}' does not exist.`);
    }
    const newPerson: Person = {
      ...person,
      treeId,
      createdAt: person.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    this.people.set(newPerson.id, newPerson);
    this.persist();
    return newPerson;
  }

  async updatePerson(
    treeId: string,
    personId: string,
    updates: Partial<Person>
  ): Promise<Person> {
    const existing = this.people.get(personId);
    if (!existing || existing.treeId !== treeId) {
      throw new NotFoundError(`Person '${personId}' not found in tree '${treeId}'`);
    }
    const updated: Person = {
      ...existing,
      ...updates,
      id: existing.id,
      treeId,
      updatedAt: getCurrentTimestamp(),
    };
    this.people.set(personId, updated);
    this.persist();
    return updated;
  }

  async removePerson(treeId: string, personId: string): Promise<void> {
    const existing = this.people.get(personId);
    if (!existing || existing.treeId !== treeId) {
      throw new NotFoundError(`Person '${personId}' not found in tree '${treeId}'`);
    }
    this.people.delete(personId);

    // Cascade relationship deletion
    for (const [rId, rel] of this.relationships.entries()) {
      if (
        rel.treeId === treeId &&
        (rel.personId1 === personId || rel.personId2 === personId)
      ) {
        this.relationships.delete(rId);
      }
    }
    this.persist();
  }

  async addRelationship(
    treeId: string,
    relationship: Relationship
  ): Promise<Relationship> {
    if (!this.trees.has(treeId)) {
      throw new NotFoundError(`Tree '${treeId}' does not exist.`);
    }

    // Referential integrity: Both people must belong to this tree!
    const p1 = this.people.get(relationship.personId1);
    const p2 = this.people.get(relationship.personId2);

    if (!p1 || p1.treeId !== treeId) {
      throw new IntegrityError(
        `Person 1 '${relationship.personId1}' does not exist in tree '${treeId}'`
      );
    }
    if (!p2 || p2.treeId !== treeId) {
      throw new IntegrityError(
        `Person 2 '${relationship.personId2}' does not exist in tree '${treeId}'`
      );
    }
    if (relationship.personId1 === relationship.personId2) {
      throw new IntegrityError(`Self relationships are prohibited.`);
    }

    const newRel: Relationship = {
      ...relationship,
      treeId,
      createdAt: relationship.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    this.relationships.set(newRel.id, newRel);
    this.persist();
    return newRel;
  }

  async removeRelationship(
    treeId: string,
    relationshipId: string
  ): Promise<void> {
    const existing = this.relationships.get(relationshipId);
    if (!existing || existing.treeId !== treeId) {
      throw new NotFoundError(
        `Relationship '${relationshipId}' not found in tree '${treeId}'`
      );
    }
    this.relationships.delete(relationshipId);
    this.persist();
  }
}
