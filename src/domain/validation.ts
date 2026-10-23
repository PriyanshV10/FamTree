import {
  CreatePersonInput,
  UpdatePersonInput,
  CreateRelationshipInput,
  Person,
  Relationship,
  ValidationResult,
  ValidationError,
} from "./types";

/**
 * Parses a date string which may be "YYYY", "YYYY-MM", or "YYYY-MM-DD".
 * Returns an approximate timestamp or year value for comparisons.
 */
export function parseDateComponents(dateStr?: string): {
  year: number;
  month?: number;
  day?: number;
} | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  const parts = trimmed.split("-").map((p) => parseInt(p, 10));

  if (parts.length >= 1 && !isNaN(parts[0])) {
    return {
      year: parts[0],
      month: parts.length >= 2 && !isNaN(parts[1]) ? parts[1] : undefined,
      day: parts.length >= 3 && !isNaN(parts[2]) ? parts[2] : undefined,
    };
  }

  // Fallback to match 4-digit year
  const match = trimmed.match(/\b\d{4}\b/);
  if (match) {
    return { year: parseInt(match[0], 10) };
  }

  return null;
}

/**
 * Validates birth and death dates.
 * Death date must not precede birth date.
 */
export function validateDates(
  birthDate?: string,
  deathDate?: string,
  isLiving: boolean = true
): ValidationResult {
  const errors: ValidationError[] = [];

  if (isLiving && deathDate && deathDate.trim() !== "") {
    errors.push({
      code: "LIVING_WITH_DEATH_DATE",
      message: "A person marked as living cannot have a recorded death date.",
      field: "deathDate",
    });
  }

  if (birthDate && deathDate) {
    const birth = parseDateComponents(birthDate);
    const death = parseDateComponents(deathDate);

    if (birth && death) {
      if (death.year < birth.year) {
        errors.push({
          code: "DEATH_BEFORE_BIRTH",
          message: `Death date (${deathDate}) cannot be earlier than birth date (${birthDate}).`,
          field: "deathDate",
        });
      } else if (death.year === birth.year) {
        if (
          death.month !== undefined &&
          birth.month !== undefined &&
          death.month < birth.month
        ) {
          errors.push({
            code: "DEATH_BEFORE_BIRTH",
            message: `Death month cannot be earlier than birth month in the same year (${death.year}).`,
            field: "deathDate",
          });
        } else if (
          death.month !== undefined &&
          birth.month !== undefined &&
          death.month === birth.month &&
          death.day !== undefined &&
          birth.day !== undefined &&
          death.day < birth.day
        ) {
          errors.push({
            code: "DEATH_BEFORE_BIRTH",
            message: `Death day cannot be earlier than birth day in the same month (${death.month}/${death.year}).`,
            field: "deathDate",
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a person's attributes.
 */
export function validatePerson(
  input: CreatePersonInput | UpdatePersonInput
): ValidationResult {
  const errors: ValidationError[] = [];

  if ("firstName" in input && (!input.firstName || input.firstName.trim() === "")) {
    errors.push({
      code: "REQUIRED_FIELD",
      message: "First name is required.",
      field: "firstName",
    });
  }

  if ("lastName" in input && (!input.lastName || input.lastName.trim() === "")) {
    errors.push({
      code: "REQUIRED_FIELD",
      message: "Last name is required.",
      field: "lastName",
    });
  }

  const dateValidation = validateDates(
    input.birthDate,
    input.deathDate,
    input.isLiving ?? true
  );

  errors.push(...dateValidation.errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates whether adding a relationship would be valid.
 * Checks for:
 * 1. Self-relationships (cannot be parent, child, or spouse of self).
 * 2. Non-existent person references.
 * 3. Cross-tree relationships.
 * 4. Duplicate relationships.
 * 5. Ancestry cycles (e.g. child becoming ancestor of their own parent).
 */
export function validateRelationship(
  input: CreateRelationshipInput,
  existingRelationships: Relationship[],
  peopleMap: Map<string, Person>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check self-relationship
  if (input.personId1 === input.personId2) {
    errors.push({
      code: "SELF_RELATIONSHIP",
      message: "A person cannot have a relationship with themselves.",
      field: "personId2",
    });
    return { isValid: false, errors };
  }

  // Check endpoints exist
  const p1 = peopleMap.get(input.personId1);
  const p2 = peopleMap.get(input.personId2);

  if (!p1) {
    errors.push({
      code: "NONEXISTENT_PERSON",
      message: `Person with ID "${input.personId1}" does not exist in the family tree.`,
      field: "personId1",
    });
  }

  if (!p2) {
    errors.push({
      code: "NONEXISTENT_PERSON",
      message: `Person with ID "${input.personId2}" does not exist in the family tree.`,
      field: "personId2",
    });
  }

  if (!p1 || !p2) {
    return { isValid: false, errors };
  }

  // Check tree membership
  if (p1.treeId !== input.treeId || p2.treeId !== input.treeId) {
    errors.push({
      code: "CROSS_TREE_RELATIONSHIP",
      message: "Both individuals in a relationship must belong to the same family tree.",
    });
    return { isValid: false, errors };
  }

  // Check duplicate relationships
  const isSpouseType = input.type === "spouse" || input.type === "former-spouse";

  for (const rel of existingRelationships) {
    if (isSpouseType) {
      const isRelSpouse = rel.type === "spouse" || rel.type === "former-spouse";
      if (
        isRelSpouse &&
        ((rel.personId1 === input.personId1 && rel.personId2 === input.personId2) ||
          (rel.personId1 === input.personId2 && rel.personId2 === input.personId1))
      ) {
        if (rel.type === input.type) {
          errors.push({
            code: "DUPLICATE_RELATIONSHIP",
            message: `A "${input.type}" relationship already exists between these two people.`,
          });
          return { isValid: false, errors };
        }
      }
    } else {
      // Directed parent-child variants
      if (
        rel.personId1 === input.personId1 &&
        rel.personId2 === input.personId2 &&
        rel.type === input.type
      ) {
        errors.push({
          code: "DUPLICATE_RELATIONSHIP",
          message: `A "${input.type}" relationship already exists between parent (${input.personId1}) and child (${input.personId2}).`,
        });
        return { isValid: false, errors };
      }
    }
  }

  // Check for ancestry cycle
  // If input is parent-child or adoptive-parent-child:
  // personId1 is proposed Parent, personId2 is proposed Child.
  // If personId1 can already be reached as a descendant of personId2,
  // making personId1 a parent of personId2 creates a cycle!
  const isParentChild =
    input.type === "parent-child" ||
    input.type === "adoptive-parent-child" ||
    input.type === "step-parent-child";

  if (isParentChild) {
    if (hasAncestryCycle(input.personId1, input.personId2, existingRelationships)) {
      errors.push({
        code: "ANCESTRY_CYCLE",
        message: `Adding this parent-child link would create an ancestry cycle: person "${input.personId2}" is already an ancestor of "${input.personId1}".`,
      });
      return { isValid: false, errors };
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if proposedChildId is already an ancestor of proposedParentId.
 * If so, connecting proposedParentId -> proposedChildId creates a cycle.
 */
export function hasAncestryCycle(
  proposedParentId: string,
  proposedChildId: string,
  relationships: Relationship[]
): boolean {
  if (proposedParentId === proposedChildId) return true;

  // Build parent -> children directed adjacency list from existing parent-child relationships
  const parentToChildren = new Map<string, string[]>();

  for (const rel of relationships) {
    if (
      rel.type === "parent-child" ||
      rel.type === "adoptive-parent-child" ||
      rel.type === "step-parent-child"
    ) {
      const list = parentToChildren.get(rel.personId1) || [];
      list.push(rel.personId2);
      parentToChildren.set(rel.personId1, list);
    }
  }

  // Perform BFS/DFS starting from proposedChildId to see if we can reach proposedParentId
  const visited = new Set<string>();
  const queue = [proposedChildId];
  visited.add(proposedChildId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === proposedParentId) {
      return true; // Cycle detected!
    }

    const children = parentToChildren.get(current) || [];
    for (const child of children) {
      if (!visited.has(child)) {
        visited.add(child);
        queue.push(child);
      }
    }
  }

  return false;
}
