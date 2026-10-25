"use client";

import { FamilyTree, Person, Relationship } from "@/domain/types";

export const STORAGE_KEY_TREES = "famtree:trees:v1";
export const STORAGE_KEY_PEOPLE = "famtree:people:v1";
export const STORAGE_KEY_RELATIONSHIPS = "famtree:relationships:v1";
export const STORAGE_KEY_DELETED_TREES = "famtree:deleted-trees:v1";

/**
 * Completely purges a tree and its associated records from browser localStorage,
 * records it in the deleted-trees tombstone so sync never resurrects it,
 * and notifies listeners.
 */
export function purgeTreeLocally(treeId: string): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Purge from trees list
    const rawTrees = window.localStorage.getItem(STORAGE_KEY_TREES);
    if (rawTrees) {
      const trees: FamilyTree[] = JSON.parse(rawTrees);
      const filtered = trees.filter((t) => t.id !== treeId);
      window.localStorage.setItem(STORAGE_KEY_TREES, JSON.stringify(filtered));
    }

    // 2. Purge from people list
    const rawPeople = window.localStorage.getItem(STORAGE_KEY_PEOPLE);
    if (rawPeople) {
      const people: Person[] = JSON.parse(rawPeople);
      const filtered = people.filter((p) => p.treeId !== treeId);
      window.localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(filtered));
    }

    // 3. Purge from relationships list
    const rawRels = window.localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
    if (rawRels) {
      const rels: Relationship[] = JSON.parse(rawRels);
      const filtered = rels.filter((r) => r.treeId !== treeId);
      window.localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(filtered));
    }

    // 4. Purge auxiliary per-tree keys
    window.localStorage.removeItem(`famtree:ref_person:${treeId}`);
    window.localStorage.removeItem(`famtree:sibling_order:${treeId}`);
    window.localStorage.removeItem(`famtree:spouse_order:${treeId}`);

    // 5. Add to tombstone deleted-trees list
    const rawDeleted = window.localStorage.getItem(STORAGE_KEY_DELETED_TREES);
    const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedIds.includes(treeId)) {
      deletedIds.push(treeId);
      window.localStorage.setItem(STORAGE_KEY_DELETED_TREES, JSON.stringify(deletedIds));
    }

    // 6. Dispatch events for reactive UI updates
    window.dispatchEvent(new CustomEvent("famtree:tree-deleted", { detail: { treeId } }));
    window.dispatchEvent(new CustomEvent("famtree:data-synced"));
  } catch (err) {
    console.warn("Failed to purge tree locally:", err);
  }
}
