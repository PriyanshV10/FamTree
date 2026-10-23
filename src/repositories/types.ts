import { FamilyTree, Person, Relationship } from "@/domain/types";

export interface TreeGraphData {
  tree: FamilyTree;
  people: Person[];
  relationships: Relationship[];
}

export class RepositoryError extends Error {
  constructor(message: string, public code: string = "REPOSITORY_ERROR", public cause?: unknown) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class NotFoundError extends RepositoryError {
  constructor(message: string) {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class IntegrityError extends RepositoryError {
  constructor(message: string) {
    super(message, "INTEGRITY_VIOLATION");
    this.name = "IntegrityError";
  }
}

export interface ITreeRepository {
  /**
   * Retrieves all family trees available.
   */
  listTrees(): Promise<FamilyTree[]>;

  /**
   * Retrieves metadata for a specific tree.
   */
  getTree(id: string): Promise<FamilyTree | null>;

  /**
   * Creates a new family tree record.
   */
  createTree(input: {
    id?: string;
    name: string;
    description?: string;
    ownerName?: string;
    ownerId?: string;
    coverColor?: string;
  }): Promise<FamilyTree>;

  /**
   * Updates metadata for an existing family tree.
   */
  updateTree(id: string, updates: Partial<FamilyTree>): Promise<FamilyTree>;

  /**
   * Deletes a family tree and cascades to all its members and relationships.
   */
  deleteTree(id: string): Promise<void>;

  /**
   * Efficiently batch loads the entire tree, all associated people,
   * and all relationships in a minimal number of parallel queries.
   */
  getTreeGraph(treeId: string): Promise<TreeGraphData | null>;

  /**
   * Adds a person to a family tree.
   */
  addPerson(treeId: string, person: Person): Promise<Person>;

  /**
   * Updates an existing person's attributes.
   */
  updatePerson(treeId: string, personId: string, updates: Partial<Person>): Promise<Person>;

  /**
   * Removes a person from a tree and cascades relationship deletions.
   */
  removePerson(treeId: string, personId: string): Promise<void>;

  /**
   * Adds a typed relationship between two people in the same tree.
   * Enforces referential integrity (both people must belong to treeId).
   */
  addRelationship(treeId: string, relationship: Relationship): Promise<Relationship>;

  /**
   * Removes a relationship by ID.
   */
  removeRelationship(treeId: string, relationshipId: string): Promise<void>;
}
