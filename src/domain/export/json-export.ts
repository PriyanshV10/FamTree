import { FamilyTree, Person, Relationship } from "@/types";
import { getCurrentTimestamp } from "@/lib/utils";

export interface FamTreeBackupData {
  version: "1.0.0";
  generator: "FamTree";
  exportedAt: string;
  tree: FamilyTree;
  people: Person[];
  relationships: Relationship[];
}

/**
 * Serialize tree, people, and relationships to formatted JSON backup format.
 */
export function exportToJson(
  tree: FamilyTree,
  people: Person[],
  relationships: Relationship[]
): string {
  const backup: FamTreeBackupData = {
    version: "1.0.0",
    generator: "FamTree",
    exportedAt: getCurrentTimestamp(),
    tree,
    people,
    relationships,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Validate and parse a FamTree JSON backup string.
 */
export function importFromJson(
  jsonText: string,
  targetTreeId?: string
): { tree?: FamilyTree; people: Person[]; relationships: Relationship[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON format. Please upload a valid JSON backup file.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid backup format: root must be an object.");
  }

  const data = parsed as Partial<FamTreeBackupData>;

  if (!Array.isArray(data.people)) {
    throw new Error("Invalid backup format: missing 'people' array.");
  }

  if (!Array.isArray(data.relationships)) {
    throw new Error("Invalid backup format: missing 'relationships' array.");
  }

  // If a targetTreeId is provided, rewrite treeId to map into the destination tree
  const treeId = targetTreeId || data.tree?.id || "imported-tree";
  const people: Person[] = data.people.map((p) => ({
    ...p,
    treeId,
  }));

  const relationships: Relationship[] = data.relationships.map((r) => ({
    ...r,
    treeId,
  }));

  let tree: FamilyTree | undefined = data.tree;
  if (tree && targetTreeId) {
    tree = {
      ...tree,
      id: targetTreeId,
    };
  }

  return { tree, people, relationships };
}
