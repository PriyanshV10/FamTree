"use client";

import { Person, Relationship } from "@/types";

const SIBLING_ORDER_PREFIX = "famtree:sibling_order:";

export type TreeSiblingOrder = Record<string, string[]>;

export interface SiblingContext {
  parentKey: string;
  parentIds: string[];
  siblingIds: string[];
  primaryPersonId: string;
}

export function getSiblingOrder(treeId: string): TreeSiblingOrder {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${SIBLING_ORDER_PREFIX}${treeId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveSiblingOrder(treeId: string, order: TreeSiblingOrder): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${SIBLING_ORDER_PREFIX}${treeId}`, JSON.stringify(order));
    window.dispatchEvent(
      new CustomEvent("famtree:sibling-order-changed", {
        detail: { treeId, order },
      })
    );
  } catch (err) {
    console.warn("Could not save sibling order:", err);
  }
}

export function resetSiblingOrder(treeId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${SIBLING_ORDER_PREFIX}${treeId}`);
    window.dispatchEvent(
      new CustomEvent("famtree:sibling-order-changed", {
        detail: { treeId, order: {} },
      })
    );
  } catch (err) {
    console.warn("Could not reset sibling order:", err);
  }
}

/**
 * Returns all node IDs in the subtree of the specified person:
 * the person, their spouse(s), union node(s), and all descendant branches recursively.
 */
export function getSubtreeNodeIds(
  rootPersonId: string,
  relationships: Relationship[],
  nodes: { id: string; type?: string; data?: unknown }[]
): Set<string> {
  const result = new Set<string>();
  const visitedPeople = new Set<string>();
  const queue: string[] = [rootPersonId];
  visitedPeople.add(rootPersonId);
  result.add(rootPersonId);

  const isParentChild = (r: Relationship) =>
    r.type === "parent-child" ||
    r.type === "adoptive-parent-child" ||
    r.type === "step-parent-child";

  const isSpouse = (r: Relationship) =>
    r.type === "spouse" || r.type === "former-spouse";

  const childrenMap = new Map<string, Set<string>>();
  const spouseMap = new Map<string, Set<string>>();

  for (const rel of relationships) {
    if (isParentChild(rel)) {
      if (!childrenMap.has(rel.personId1)) {
        childrenMap.set(rel.personId1, new Set());
      }
      childrenMap.get(rel.personId1)!.add(rel.personId2);
    } else if (isSpouse(rel)) {
      if (!spouseMap.has(rel.personId1)) spouseMap.set(rel.personId1, new Set());
      if (!spouseMap.has(rel.personId2)) spouseMap.set(rel.personId2, new Set());
      spouseMap.get(rel.personId1)!.add(rel.personId2);
      spouseMap.get(rel.personId2)!.add(rel.personId1);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;

    // Spouses
    const spouses = spouseMap.get(curr);
    if (spouses) {
      for (const sp of spouses) {
        if (!visitedPeople.has(sp)) {
          visitedPeople.add(sp);
          result.add(sp);
          const spKids = childrenMap.get(sp);
          if (spKids) {
            for (const ch of spKids) {
              if (!visitedPeople.has(ch)) {
                visitedPeople.add(ch);
                result.add(ch);
                queue.push(ch);
              }
            }
          }
        }
      }
    }

    // Children
    const kids = childrenMap.get(curr);
    if (kids) {
      for (const ch of kids) {
        if (!visitedPeople.has(ch)) {
          visitedPeople.add(ch);
          result.add(ch);
          queue.push(ch);
        }
      }
    }
  }

  // Include union nodes connecting people in the subtree
  for (const node of nodes) {
    if (node.type === "unionNode") {
      const data = node.data as { spouse1Id?: string; spouse2Id?: string } | undefined;
      if (
        data &&
        ((data.spouse1Id && result.has(data.spouse1Id)) ||
          (data.spouse2Id && result.has(data.spouse2Id)))
      ) {
        result.add(node.id);
      }
    }
  }

  return result;
}

/**
 * Returns the sibling context for a person:
 * which sibling group they belong to (by parent IDs, or "root"),
 * and the list of sibling IDs in that group.
 */
export function getSiblingContext(
  personId: string,
  people: Person[],
  relationships: Relationship[]
): SiblingContext | null {
  const isParentChild = (r: Relationship) =>
    r.type === "parent-child" ||
    r.type === "adoptive-parent-child" ||
    r.type === "step-parent-child";

  let targetId = personId;
  let parentRels = relationships.filter(
    (r) => isParentChild(r) && r.personId2 === targetId
  );

  // If node has no parents, check if its spouse has parents in the tree
  if (parentRels.length === 0) {
    const spouseRels = relationships.filter(
      (r) =>
        (r.type === "spouse" || r.type === "former-spouse") &&
        (r.personId1 === targetId || r.personId2 === targetId)
    );
    for (const sRel of spouseRels) {
      const partnerId = sRel.personId1 === targetId ? sRel.personId2 : sRel.personId1;
      const partnerParents = relationships.filter(
        (r) => isParentChild(r) && r.personId2 === partnerId
      );
      if (partnerParents.length > 0) {
        targetId = partnerId;
        parentRels = partnerParents;
        break;
      }
    }
  }

  if (parentRels.length > 0) {
    const parentIds = Array.from(new Set(parentRels.map((r) => r.personId1))).sort();
    const parentKey = parentIds.join("___");

    const siblingSet = new Set<string>();
    siblingSet.add(targetId);

    for (const rel of relationships) {
      if (isParentChild(rel) && parentIds.includes(rel.personId1)) {
        siblingSet.add(rel.personId2);
      }
    }

    return {
      parentKey,
      parentIds,
      siblingIds: Array.from(siblingSet),
      primaryPersonId: targetId,
    };
  }

  // Generation 0 root nodes (no parents in tree)
  const allChildren = new Set(
    relationships.filter(isParentChild).map((r) => r.personId2)
  );
  const rootPeople = people.filter((p) => !allChildren.has(p.id));

  const isSpouse = (r: Relationship) =>
    r.type === "spouse" || r.type === "former-spouse";
  const visitedSpouse = new Set<string>();
  const rootPrimaryIds: string[] = [];

  for (const rp of rootPeople) {
    if (visitedSpouse.has(rp.id)) continue;
    rootPrimaryIds.push(rp.id);
    visitedSpouse.add(rp.id);
    for (const sr of relationships.filter(isSpouse)) {
      if (sr.personId1 === rp.id) visitedSpouse.add(sr.personId2);
      if (sr.personId2 === rp.id) visitedSpouse.add(sr.personId1);
    }
  }

  return {
    parentKey: "root",
    parentIds: [],
    siblingIds: rootPrimaryIds,
    primaryPersonId: targetId,
  };
}

