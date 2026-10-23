import {
  Person,
  Relationship,
  RelationshipType,
  CreatePersonInput,
  UpdatePersonInput,
  CreateRelationshipInput,
  AncestorInfo,
  DescendantInfo,
  CommonAncestor,
  PathSegment,
  ConnectionNature,
  PathDirection,
} from "./types";
import { validatePerson, validateRelationship } from "./validation";
import { createId, getCurrentTimestamp } from "@/lib/utils";

export class FamilyGraph {
  private treeId: string;
  private people: Map<string, Person> = new Map();
  private relationships: Map<string, Relationship> = new Map();

  // Adjacency index: personId -> Relationship[]
  private personToRelationships: Map<string, Set<string>> = new Map();

  constructor(
    treeId: string = "default-tree",
    initialPeople: Person[] = [],
    initialRelationships: Relationship[] = []
  ) {
    this.treeId = treeId;
    for (const p of initialPeople) {
      this.people.set(p.id, { ...p });
    }
    for (const r of initialRelationships) {
      this.relationships.set(r.id, { ...r });
      this.indexRelationship(r);
    }
  }

  public getTreeId(): string {
    return this.treeId;
  }

  private indexRelationship(rel: Relationship): void {
    if (!this.personToRelationships.has(rel.personId1)) {
      this.personToRelationships.set(rel.personId1, new Set());
    }
    this.personToRelationships.get(rel.personId1)!.add(rel.id);

    if (!this.personToRelationships.has(rel.personId2)) {
      this.personToRelationships.set(rel.personId2, new Set());
    }
    this.personToRelationships.get(rel.personId2)!.add(rel.id);
  }

  private unindexRelationship(rel: Relationship): void {
    this.personToRelationships.get(rel.personId1)?.delete(rel.id);
    this.personToRelationships.get(rel.personId2)?.delete(rel.id);
  }

  // --- Person Operations ---

  public addPerson(input: CreatePersonInput): Person {
    const validation = validatePerson(input);
    if (!validation.isValid) {
      throw new Error(
        `Invalid person data: ${validation.errors.map((e) => e.message).join(", ")}`
      );
    }

    const id = input.id || createId("person");
    const now = getCurrentTimestamp();

    const person: Person = {
      id,
      treeId: input.treeId || this.treeId,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || undefined,
      lastName: input.lastName.trim(),
      maidenName: input.maidenName?.trim() || undefined,
      displayName: input.displayName?.trim() || undefined,
      gender: input.gender || "unknown",
      birthDate: input.birthDate?.trim() || undefined,
      deathDate: input.deathDate?.trim() || undefined,
      isLiving: input.isLiving ?? true,
      birthplace: input.birthplace?.trim() || undefined,
      occupation: input.occupation?.trim() || undefined,
      biography: input.biography?.trim() || undefined,
      photoUrl: input.photoUrl?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.people.set(person.id, person);
    return person;
  }

  public updatePerson(id: string, updates: UpdatePersonInput): Person {
    const existing = this.people.get(id);
    if (!existing) {
      throw new Error(`Person with ID "${id}" not found.`);
    }

    const validation = validatePerson({ ...existing, ...updates });
    if (!validation.isValid) {
      throw new Error(
        `Invalid updates for person: ${validation.errors.map((e) => e.message).join(", ")}`
      );
    }

    const updated: Person = {
      ...existing,
      ...updates,
      firstName: updates.firstName !== undefined ? updates.firstName.trim() : existing.firstName,
      middleName: updates.middleName !== undefined ? updates.middleName.trim() || undefined : existing.middleName,
      lastName: updates.lastName !== undefined ? updates.lastName.trim() : existing.lastName,
      maidenName: updates.maidenName !== undefined ? updates.maidenName.trim() || undefined : existing.maidenName,
      displayName: updates.displayName !== undefined ? updates.displayName.trim() || undefined : existing.displayName,
      birthplace: updates.birthplace !== undefined ? updates.birthplace.trim() || undefined : existing.birthplace,
      occupation: updates.occupation !== undefined ? updates.occupation.trim() || undefined : existing.occupation,
      biography: updates.biography !== undefined ? updates.biography.trim() || undefined : existing.biography,
      updatedAt: getCurrentTimestamp(),
    };

    this.people.set(id, updated);
    return updated;
  }

  public removePerson(id: string): boolean {
    if (!this.people.has(id)) return false;

    // Remove all associated relationships
    const relIds = Array.from(this.personToRelationships.get(id) || []);
    for (const relId of relIds) {
      this.removeRelationship(relId);
    }

    this.personToRelationships.delete(id);
    this.people.delete(id);
    return true;
  }

  public getPerson(id: string): Person | undefined {
    return this.people.get(id);
  }

  public getAllPeople(): Person[] {
    return Array.from(this.people.values());
  }

  // --- Relationship Operations ---

  public addRelationship(input: CreateRelationshipInput): Relationship {
    const validation = validateRelationship(
      input,
      this.getAllRelationships(),
      this.people
    );

    if (!validation.isValid) {
      throw new Error(
        `Cannot add relationship: ${validation.errors.map((e) => e.message).join(", ")}`
      );
    }

    const id = input.id || createId("rel");
    const now = getCurrentTimestamp();

    const rel: Relationship = {
      id,
      treeId: input.treeId || this.treeId,
      personId1: input.personId1,
      personId2: input.personId2,
      type: input.type,
      startDate: input.startDate || undefined,
      endDate: input.endDate || undefined,
      notes: input.notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.relationships.set(id, rel);
    this.indexRelationship(rel);
    return rel;
  }

  public removeRelationship(id: string): boolean {
    const rel = this.relationships.get(id);
    if (!rel) return false;

    this.unindexRelationship(rel);
    this.relationships.delete(id);
    return true;
  }

  public getRelationship(id: string): Relationship | undefined {
    return this.relationships.get(id);
  }

  public getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values());
  }

  // --- Relationship Query Helpers ---

  private getPersonRelationships(personId: string): Relationship[] {
    const ids = this.personToRelationships.get(personId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.relationships.get(id))
      .filter((r): r is Relationship => r !== undefined);
  }

  /**
   * Find parents of a person.
   * In a parent-child relationship, personId1 is parent, personId2 is child.
   */
  public getParents(
    personId: string,
    types: RelationshipType[] = ["parent-child", "adoptive-parent-child", "step-parent-child"]
  ): { person: Person; relationship: Relationship }[] {
    const rels = this.getPersonRelationships(personId);
    const results: { person: Person; relationship: Relationship }[] = [];

    for (const rel of rels) {
      if (types.includes(rel.type) && rel.personId2 === personId) {
        const parent = this.people.get(rel.personId1);
        if (parent) {
          results.push({ person: parent, relationship: rel });
        }
      }
    }
    return results;
  }

  /**
   * Find children of a person.
   */
  public getChildren(
    personId: string,
    types: RelationshipType[] = ["parent-child", "adoptive-parent-child", "step-parent-child"]
  ): { person: Person; relationship: Relationship }[] {
    const rels = this.getPersonRelationships(personId);
    const results: { person: Person; relationship: Relationship }[] = [];

    for (const rel of rels) {
      if (types.includes(rel.type) && rel.personId1 === personId) {
        const child = this.people.get(rel.personId2);
        if (child) {
          results.push({ person: child, relationship: rel });
        }
      }
    }
    return results;
  }

  /**
   * Find spouses or partners of a person.
   */
  public getSpouses(
    personId: string,
    includeFormer: boolean = true
  ): { person: Person; relationship: Relationship }[] {
    const rels = this.getPersonRelationships(personId);
    const results: { person: Person; relationship: Relationship }[] = [];

    for (const rel of rels) {
      if (
        rel.type === "spouse" ||
        (includeFormer && rel.type === "former-spouse")
      ) {
        const partnerId =
          rel.personId1 === personId ? rel.personId2 : rel.personId1;
        const partner = this.people.get(partnerId);
        if (partner) {
          results.push({ person: partner, relationship: rel });
        }
      }
    }
    return results;
  }

  /**
   * Find siblings: people who share at least one parent (or adoptive parent).
   */
  public getSiblings(personId: string): {
    person: Person;
    sharedParents: Person[];
    type: "full" | "half" | "adoptive" | "step";
  }[] {
    const parents = this.getParents(personId);
    if (parents.length === 0) return [];

    const parentIds = new Set(parents.map((p) => p.person.id));

    const candidateSiblings = new Map<
      string,
      { sharedParents: Person[]; types: RelationshipType[] }
    >();

    for (const { person: parent } of parents) {
      const childrenOfParent = this.getChildren(parent.id);
      for (const { person: child, relationship: childRel } of childrenOfParent) {
        if (child.id === personId) continue;

        if (!candidateSiblings.has(child.id)) {
          candidateSiblings.set(child.id, { sharedParents: [], types: [] });
        }
        candidateSiblings.get(child.id)!.sharedParents.push(parent);
        candidateSiblings.get(child.id)!.types.push(childRel.type);
      }
    }

    const results: {
      person: Person;
      sharedParents: Person[];
      type: "full" | "half" | "adoptive" | "step";
    }[] = [];

    for (const [siblingId, data] of candidateSiblings.entries()) {
      const sibling = this.people.get(siblingId);
      if (!sibling) continue;

      const otherParents = this.getParents(siblingId);
      const isAdoptive = data.types.some((t) => t === "adoptive-parent-child");
      const isStep = data.types.some((t) => t === "step-parent-child");

      let siblingType: "full" | "half" | "adoptive" | "step" = "half";
      if (isStep) {
        siblingType = "step";
      } else if (isAdoptive) {
        siblingType = "adoptive";
      } else if (
        data.sharedParents.length >= 2 ||
        (parentIds.size === 1 && otherParents.length === 1 && data.sharedParents.length === 1)
      ) {
        siblingType = "full";
      }

      results.push({
        person: sibling,
        sharedParents: data.sharedParents,
        type: siblingType,
      });
    }

    return results;
  }

  /**
   * Find grandparents.
   */
  public getGrandparents(personId: string): {
    person: Person;
    viaParent: Person;
    nature: ConnectionNature;
  }[] {
    const parents = this.getParents(personId);
    const results: { person: Person; viaParent: Person; nature: ConnectionNature }[] = [];

    for (const { person: parent, relationship: parentRel } of parents) {
      const grandparents = this.getParents(parent.id);
      for (const { person: gp, relationship: gpRel } of grandparents) {
        const nature: ConnectionNature =
          parentRel.type === "adoptive-parent-child" || gpRel.type === "adoptive-parent-child"
            ? "adoptive"
            : parentRel.type === "step-parent-child" || gpRel.type === "step-parent-child"
            ? "step"
            : "biological";

        results.push({
          person: gp,
          viaParent: parent,
          nature,
        });
      }
    }

    return results;
  }

  /**
   * Find grandchildren.
   */
  public getGrandchildren(personId: string): {
    person: Person;
    viaChild: Person;
    nature: ConnectionNature;
  }[] {
    const children = this.getChildren(personId);
    const results: { person: Person; viaChild: Person; nature: ConnectionNature }[] = [];

    for (const { person: child, relationship: childRel } of children) {
      const grandchildren = this.getChildren(child.id);
      for (const { person: gc, relationship: gcRel } of grandchildren) {
        const nature: ConnectionNature =
          childRel.type === "adoptive-parent-child" || gcRel.type === "adoptive-parent-child"
            ? "adoptive"
            : childRel.type === "step-parent-child" || gcRel.type === "step-parent-child"
            ? "step"
            : "biological";

        results.push({
          person: gc,
          viaChild: child,
          nature,
        });
      }
    }

    return results;
  }

  /**
   * Retrieve ancestors up to a specified generation depth.
   */
  public getAncestors(
    personId: string,
    maxDepth: number = 10
  ): AncestorInfo[] {
    const ancestors: AncestorInfo[] = [];
    const visited = new Set<string>();

    interface QueueItem {
      personId: string;
      depth: number;
      nature: ConnectionNature;
      rels: Relationship[];
    }

    const queue: QueueItem[] = [{ personId, depth: 0, nature: "biological", rels: [] }];
    visited.add(personId);

    while (queue.length > 0) {
      const { personId: currId, depth, nature, rels } = queue.shift()!;

      if (depth >= maxDepth) continue;

      const parents = this.getParents(currId);
      for (const { person: parent, relationship } of parents) {
        if (!visited.has(parent.id)) {
          visited.add(parent.id);

          const stepNature: ConnectionNature =
            relationship.type === "adoptive-parent-child"
              ? "adoptive"
              : relationship.type === "step-parent-child"
              ? "step"
              : "biological";

          const combinedNature: ConnectionNature =
            nature === "biological" ? stepNature : "mixed";

          const currentRels = [...rels, relationship];

          ancestors.push({
            person: parent,
            generationDistance: depth + 1,
            nature: combinedNature,
            viaRelationships: currentRels,
          });

          queue.push({
            personId: parent.id,
            depth: depth + 1,
            nature: combinedNature,
            rels: currentRels,
          });
        }
      }
    }

    return ancestors;
  }

  /**
   * Retrieve descendants up to a specified generation depth.
   */
  public getDescendants(
    personId: string,
    maxDepth: number = 10
  ): DescendantInfo[] {
    const descendants: DescendantInfo[] = [];
    const visited = new Set<string>();

    interface QueueItem {
      personId: string;
      depth: number;
      nature: ConnectionNature;
      rels: Relationship[];
    }

    const queue: QueueItem[] = [{ personId, depth: 0, nature: "biological", rels: [] }];
    visited.add(personId);

    while (queue.length > 0) {
      const { personId: currId, depth, nature, rels } = queue.shift()!;

      if (depth >= maxDepth) continue;

      const children = this.getChildren(currId);
      for (const { person: child, relationship } of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);

          const stepNature: ConnectionNature =
            relationship.type === "adoptive-parent-child"
              ? "adoptive"
              : relationship.type === "step-parent-child"
              ? "step"
              : "biological";

          const combinedNature: ConnectionNature =
            nature === "biological" ? stepNature : "mixed";

          const currentRels = [...rels, relationship];

          descendants.push({
            person: child,
            generationDistance: depth + 1,
            nature: combinedNature,
            viaRelationships: currentRels,
          });

          queue.push({
            personId: child.id,
            depth: depth + 1,
            nature: combinedNature,
            rels: currentRels,
          });
        }
      }
    }

    return descendants;
  }

  /**
   * Finds common ancestors between two people.
   */
  public getCommonAncestors(
    personId1: string,
    personId2: string
  ): CommonAncestor[] {
    if (personId1 === personId2) return [];

    const ancestors1 = this.getAncestors(personId1);
    const ancestors2 = this.getAncestors(personId2);

    const map1 = new Map(ancestors1.map((a) => [a.person.id, a]));
    const common: CommonAncestor[] = [];

    for (const a2 of ancestors2) {
      const a1 = map1.get(a2.person.id);
      if (a1) {
        common.push({
          ancestor: a1.person,
          distance1: a1.generationDistance,
          distance2: a2.generationDistance,
          nature1: a1.nature,
          nature2: a2.nature,
        });
      }
    }

    // Sort by total distance (closest first)
    common.sort((a, b) => a.distance1 + a.distance2 - (b.distance1 + b.distance2));
    return common;
  }

  /**
   * Finds the shortest path between two people across all relationships using Breadth-First Search.
   */
  public findShortestPath(
    personId1: string,
    personId2: string
  ): PathSegment[] | null {
    if (personId1 === personId2) return [];

    const startPerson = this.people.get(personId1);
    const targetPerson = this.people.get(personId2);
    if (!startPerson || !targetPerson) return null;

    interface BFSNode {
      personId: string;
      path: PathSegment[];
    }

    const visited = new Set<string>();
    visited.add(personId1);
    const queue: BFSNode[] = [{ personId: personId1, path: [] }];

    while (queue.length > 0) {
      const { personId: currentId, path } = queue.shift()!;

      if (currentId === personId2) {
        return path;
      }

      const currentPerson = this.people.get(currentId)!;
      const rels = this.getPersonRelationships(currentId);

      for (const rel of rels) {
        let neighborId: string | null = null;
        let direction: PathDirection = "spouse";
        let stepDescription = "";

        if (rel.type === "spouse" || rel.type === "former-spouse") {
          neighborId = rel.personId1 === currentId ? rel.personId2 : rel.personId1;
          direction = rel.type === "spouse" ? "spouse" : "former-spouse";
          stepDescription = rel.type === "spouse" ? "Partner / Spouse" : "Former Partner";
        } else {
          // Parent-child relationships
          if (rel.personId1 === currentId) {
            // current is parent, neighbor is child
            neighborId = rel.personId2;
            direction = "parent-to-child";
            stepDescription =
              rel.type === "adoptive-parent-child"
                ? "Adoptive Child"
                : rel.type === "step-parent-child"
                ? "Step-Child"
                : "Child";
          } else if (rel.personId2 === currentId) {
            // current is child, neighbor is parent
            neighborId = rel.personId1;
            direction = "child-to-parent";
            stepDescription =
              rel.type === "adoptive-parent-child"
                ? "Adoptive Parent"
                : rel.type === "step-parent-child"
                ? "Step-Parent"
                : "Parent";
          }
        }

        if (neighborId && !visited.has(neighborId)) {
          visited.add(neighborId);
          const neighborPerson = this.people.get(neighborId);
          if (neighborPerson) {
            const segment: PathSegment = {
              from: currentPerson,
              to: neighborPerson,
              relationship: rel,
              direction,
              stepDescription,
            };

            queue.push({
              personId: neighborId,
              path: [...path, segment],
            });
          }
        }
      }
    }

    return null; // Disconnected graph
  }
}
