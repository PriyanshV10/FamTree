"use client";

import { FamilyTree, Person, Relationship } from "@/domain/types";
import { getTreeRepository } from "@/repositories";
import { createId, getCurrentTimestamp } from "@/lib/utils";
import { getReferencePersonConfig, saveReferencePersonConfig } from "./reference-person";
import { getSiblingOrder, saveSiblingOrder } from "./sibling-order";
import { getSpouseOrder, saveSpouseOrder } from "./spouse-order";

export interface DuplicateTreeOptions {
  tree: FamilyTree;
  people: Person[];
  relationships: Relationship[];
  ownerId?: string;
  ownerName?: string;
  customTreeName?: string;
}

/**
 * Copies a complete family tree, all people, and all relationships into the user's active repository.
 * Generates fresh unique IDs to ensure total isolation from the original tree.
 */
export async function duplicateTreeToAccount({
  tree,
  people,
  relationships,
  ownerId,
  ownerName,
  customTreeName,
}: DuplicateTreeOptions): Promise<FamilyTree> {
  const repo = getTreeRepository();

  const newTreeName = customTreeName || `${tree.name} (Copy)`;
  const newTree = await repo.createTree({
    name: newTreeName,
    description: tree.description || `Shared copy of ${tree.name}`,
    ownerName: ownerName || "Curator",
    ownerId,
    coverColor: tree.coverColor || "bg-emerald-800",
  });

  // Map old person IDs to brand new unique person IDs
  const personIdMap = new Map<string, string>();
  for (const p of people) {
    personIdMap.set(p.id, createId("person"));
  }

  // Duplicate all people under new tree
  for (const p of people) {
    const newPersonId = personIdMap.get(p.id)!;
    await repo.addPerson(newTree.id, {
      ...p,
      id: newPersonId,
      treeId: newTree.id,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    });
  }

  // Duplicate all relationships under new tree
  for (const r of relationships) {
    const newP1 = personIdMap.get(r.personId1);
    const newP2 = personIdMap.get(r.personId2);
    if (newP1 && newP2) {
      await repo.addRelationship(newTree.id, {
        ...r,
        id: createId("rel"),
        treeId: newTree.id,
        personId1: newP1,
        personId2: newP2,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
    }
  }

  // Clone Reference Person Config if set
  const refConfig = getReferencePersonConfig(tree.id, people);
  if (refConfig && personIdMap.has(refConfig.personId)) {
    saveReferencePersonConfig(newTree.id, {
      ...refConfig,
      personId: personIdMap.get(refConfig.personId)!,
    });
  }

  // Clone Sibling Order if set
  const sibOrder = getSiblingOrder(tree.id);
  if (Object.keys(sibOrder).length > 0) {
    const newSibOrder: Record<string, string[]> = {};
    for (const [key, ids] of Object.entries(sibOrder)) {
      const newKey = personIdMap.get(key) || key;
      const newIds = ids.map((id) => personIdMap.get(id) || id);
      newSibOrder[newKey] = newIds;
    }
    saveSiblingOrder(newTree.id, newSibOrder);
  }

  // Clone Spouse Order if set
  const spOrder = getSpouseOrder(tree.id);
  if (Object.keys(spOrder).length > 0) {
    const newSpOrder: Record<string, string[]> = {};
    for (const [key, pair] of Object.entries(spOrder)) {
      const parts = key.split("___");
      if (parts.length === 2 && personIdMap.has(parts[0]) && personIdMap.has(parts[1])) {
        const newKey = [personIdMap.get(parts[0])!, personIdMap.get(parts[1])!].sort().join("___");
        const newPair = pair.map((id) => personIdMap.get(id) || id);
        newSpOrder[newKey] = newPair;
      } else {
        const newKey = personIdMap.get(key) || key;
        const newPair = pair.map((id) => personIdMap.get(id) || id);
        newSpOrder[newKey] = newPair;
      }
    }
    saveSpouseOrder(newTree.id, newSpOrder);
  }

  return newTree;
}
