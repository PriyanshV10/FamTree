"use client";

const SPOUSE_ORDER_PREFIX = "famtree:spouse_order:";

export type TreeSpouseOrder = Record<string, string[]>;

/**
 * Loads custom spouse ordering for a tree from localStorage.
 * Keys are sorted couple IDs (`"${id1}___${id2}"`), values are ordered pairs of person IDs `[leftId, rightId]`.
 */
export function getSpouseOrder(treeId: string): TreeSpouseOrder {
  if (typeof window === "undefined" || !treeId) return {};
  try {
    const raw = localStorage.getItem(`${SPOUSE_ORDER_PREFIX}${treeId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Saves custom spouse ordering to localStorage and dispatches a change event.
 */
export function saveSpouseOrder(treeId: string, order: TreeSpouseOrder): void {
  if (typeof window === "undefined" || !treeId) return;
  try {
    localStorage.setItem(`${SPOUSE_ORDER_PREFIX}${treeId}`, JSON.stringify(order));
    window.dispatchEvent(
      new CustomEvent("famtree:spouse-order-changed", {
        detail: { treeId, order },
      })
    );
  } catch (err) {
    console.warn("Could not save spouse order:", err);
  }
}

/**
 * Swaps the horizontal order of two spouses in the persistent store.
 */
export function swapSpousesInOrder(
  treeId: string,
  spouse1Id: string,
  spouse2Id: string,
  currentOrder?: TreeSpouseOrder
): TreeSpouseOrder {
  const pairKey = [spouse1Id, spouse2Id].sort().join("___");
  const existing = currentOrder || getSpouseOrder(treeId);
  const currentPair = existing[pairKey];

  let newPair: string[];
  if (currentPair && currentPair.length === 2) {
    // Invert the existing custom ordering
    newPair = [currentPair[1], currentPair[0]];
  } else {
    // If not previously customized, spouse1Id was on the left and spouse2Id on the right
    newPair = [spouse2Id, spouse1Id];
  }

  const updated: TreeSpouseOrder = {
    ...existing,
    [pairKey]: newPair,
  };

  saveSpouseOrder(treeId, updated);
  return updated;
}

/**
 * Resets all custom spouse ordering for the tree.
 */
export function resetSpouseOrder(treeId: string): void {
  if (typeof window === "undefined" || !treeId) return;
  try {
    localStorage.removeItem(`${SPOUSE_ORDER_PREFIX}${treeId}`);
    window.dispatchEvent(
      new CustomEvent("famtree:spouse-order-changed", {
        detail: { treeId, order: {} },
      })
    );
  } catch (err) {
    console.warn("Could not reset spouse order:", err);
  }
}
