"use client";

import { Person } from "@/types";

export interface ReferencePersonConfig {
  personId: string;
  baseGeneration: number;
  updatedAt?: string;
}

const REFERENCE_PERSON_PREFIX = "famtree:reference_person:";

/**
 * Deterministic fallback reference person config based purely on people list.
 * Identical on both server SSR and client initial hydration.
 */
export function getDefaultReferencePersonConfig(
  people: Person[]
): ReferencePersonConfig | null {
  if (people.length > 0) {
    const sorted = [...people].sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );
    const initialPerson = sorted[0] || people[0];
    return {
      personId: initialPerson.id,
      baseGeneration: 0,
    };
  }
  return null;
}

/**
 * Retrieves the reference person configuration for a tree.
 * Defaults automatically to the first created person (or earliest person) if not explicitly set.
 */
export function getReferencePersonConfig(
  treeId: string,
  people: Person[]
): ReferencePersonConfig | null {
  if (typeof window !== "undefined" && treeId) {
    try {
      const raw = localStorage.getItem(`${REFERENCE_PERSON_PREFIX}${treeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.personId === "string") {
          // Confirm person still exists in this tree
          if (people.some((p) => p.id === parsed.personId)) {
            return {
              personId: parsed.personId,
              baseGeneration:
                typeof parsed.baseGeneration === "number" ? parsed.baseGeneration : 0,
            };
          }
        }
      }
    } catch (err) {
      console.warn("Could not read reference person config:", err);
    }
  }

  // Automatic initial fallback: first person added to tree
  return getDefaultReferencePersonConfig(people);
}

/**
 * Persists the reference person choice permanently in localStorage
 * and notifies listening components via window custom event.
 */
export function saveReferencePersonConfig(
  treeId: string,
  config: ReferencePersonConfig
): void {
  if (typeof window === "undefined" || !treeId) return;
  try {
    localStorage.setItem(
      `${REFERENCE_PERSON_PREFIX}${treeId}`,
      JSON.stringify(config)
    );
    window.dispatchEvent(
      new CustomEvent("famtree:reference-person-changed", {
        detail: { treeId, config },
      })
    );
  } catch (err) {
    console.warn("Could not save reference person config:", err);
  }
}

/**
 * Resets the reference person to auto/first.
 */
export function resetReferencePersonConfig(treeId: string): void {
  if (typeof window === "undefined" || !treeId) return;
  try {
    localStorage.removeItem(`${REFERENCE_PERSON_PREFIX}${treeId}`);
    window.dispatchEvent(
      new CustomEvent("famtree:reference-person-changed", {
        detail: { treeId, config: null },
      })
    );
  } catch (err) {
    console.warn("Could not reset reference person config:", err);
  }
}
