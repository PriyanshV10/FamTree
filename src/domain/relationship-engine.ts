import {
  Person,
  RelationshipResolution,
  RelationshipCategory,
  ConnectionNature,
  Gender,
} from "./types";
import { FamilyGraph } from "./family-graph";

export function getFullName(person: Person): string {
  if (person.displayName) return person.displayName;
  const parts = [person.firstName, person.middleName, person.lastName].filter(Boolean);
  return parts.join(" ");
}

function getGenderTerm(
  gender: Gender,
  male: string,
  female: string,
  neutral: string
): string {
  if (gender === "male") return male;
  if (gender === "female") return female;
  return neutral;
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Deterministic Family Relationship Resolver.
 * Computes exact genealogical connection between person1 and person2 without LLM guessing.
 */
export function resolveRelationship(
  graph: FamilyGraph,
  personId1: string,
  personId2: string
): RelationshipResolution {
  const p1 = graph.getPerson(personId1);
  const p2 = graph.getPerson(personId2);

  if (!p1 || !p2) {
    const missing = !p1 ? personId1 : personId2;
    return {
      person1: p1 || ({ id: personId1, firstName: "Unknown", lastName: "Person" } as Person),
      person2: p2 || ({ id: personId2, firstName: "Unknown", lastName: "Person" } as Person),
      label: "Unknown Person",
      category: "unrelated",
      nature: "none",
      isBloodRelated: false,
      commonAncestors: [],
      shortestPath: [],
      explanation: `Cannot resolve relationship: person "${missing}" does not exist in this family tree.`,
    };
  }

  const p1Name = getFullName(p1);
  const p2Name = getFullName(p2);

  // 1. Same Person
  if (personId1 === personId2) {
    return {
      person1: p1,
      person2: p2,
      label: "Self",
      category: "self",
      nature: "none",
      isBloodRelated: true,
      commonAncestors: [],
      shortestPath: [],
      explanation: `${p1Name} is the same person.`,
    };
  }

  // 2. Shortest Path via BFS
  const shortestPath = graph.findShortestPath(personId1, personId2);
  if (!shortestPath || shortestPath.length === 0) {
    return {
      person1: p1,
      person2: p2,
      label: "Unrelated / Disconnected",
      category: "unrelated",
      nature: "none",
      isBloodRelated: false,
      commonAncestors: [],
      shortestPath: [],
      explanation: `No recorded relationship connects ${p1Name} and ${p2Name} in this family tree.`,
    };
  }

  // 3. Common Ancestors Search (for blood relatives and cousins)
  const commonAncestors = graph.getCommonAncestors(personId1, personId2);

  // --- Category A: Direct Parent-Child ---
  if (shortestPath.length === 1) {
    const segment = shortestPath[0];
    const rel = segment.relationship;

    const isParentChild =
      rel.type === "parent-child" ||
      rel.type === "adoptive-parent-child" ||
      rel.type === "step-parent-child";

    // p1 is parent of p2
    if (isParentChild && rel.personId1 === personId1 && rel.personId2 === personId2) {
      const isAdoptive = rel.type === "adoptive-parent-child";
      const isStep = rel.type === "step-parent-child";

      const prefix = isAdoptive ? "Adoptive " : isStep ? "Step-" : "";
      const baseLabel = getGenderTerm(p1.gender, "Father", "Mother", "Parent");
      const label = `${prefix}${baseLabel}`;
      const nature: ConnectionNature = isAdoptive ? "adoptive" : isStep ? "step" : "biological";

      return {
        person1: p1,
        person2: p2,
        label,
        category: "parent",
        nature,
        isBloodRelated: !isAdoptive && !isStep,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name}.`,
      };
    }

    // p1 is child of p2
    if (isParentChild && rel.personId2 === personId1 && rel.personId1 === personId2) {
      const isAdoptive = rel.type === "adoptive-parent-child";
      const isStep = rel.type === "step-parent-child";

      const prefix = isAdoptive ? "Adoptive " : isStep ? "Step-" : "";
      const baseLabel = getGenderTerm(p1.gender, "Son", "Daughter", "Child");
      const label = `${prefix}${baseLabel}`;
      const nature: ConnectionNature = isAdoptive ? "adoptive" : isStep ? "step" : "biological";

      return {
        person1: p1,
        person2: p2,
        label,
        category: "child",
        nature,
        isBloodRelated: !isAdoptive && !isStep,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name}.`,
      };
    }

    // Spouse / Partner
    if (rel.type === "spouse" || rel.type === "former-spouse") {
      const isFormer = rel.type === "former-spouse";
      const baseLabel = getGenderTerm(
        p1.gender,
        isFormer ? "Former Husband" : "Husband",
        isFormer ? "Former Wife" : "Wife",
        isFormer ? "Former Partner" : "Partner"
      );

      return {
        person1: p1,
        person2: p2,
        label: baseLabel,
        category: isFormer ? "former-spouse" : "spouse",
        nature: "marriage",
        isBloodRelated: false,
        commonAncestors: [],
        shortestPath,
        explanation: isFormer
          ? `${p1Name} is the former partner/spouse of ${p2Name}.`
          : `${p1Name} and ${p2Name} are married or partners.`,
      };
    }
  }

  // --- Category B: Siblings (Length 2 via shared parent) ---
  const siblings = graph.getSiblings(personId1);
  const siblingMatch = siblings.find((s) => s.person.id === personId2);
  if (siblingMatch) {
    const type = siblingMatch.type;
    let label = "";

    if (type === "step") {
      label = getGenderTerm(p1.gender, "Step-Brother", "Step-Sister", "Step-Sibling");
    } else if (type === "adoptive") {
      label = getGenderTerm(p1.gender, "Adoptive Brother", "Adoptive Sister", "Adoptive Sibling");
    } else if (type === "half") {
      label = getGenderTerm(p1.gender, "Half-Brother", "Half-Sister", "Half-Sibling");
    } else {
      label = getGenderTerm(p1.gender, "Brother", "Sister", "Sibling");
    }

    const nature: ConnectionNature =
      type === "step" ? "step" : type === "adoptive" ? "adoptive" : "biological";

    const sharedNames = siblingMatch.sharedParents.map(getFullName).join(" and ");
    const explanation =
      type === "step"
        ? `${p1Name} and ${p2Name} are step-siblings through marriage of their respective parents.`
        : `${p1Name} is the ${label.toLowerCase()} of ${p2Name}, sharing parentage through ${sharedNames}.`;

    return {
      person1: p1,
      person2: p2,
      label,
      category: "sibling",
      nature,
      isBloodRelated: type === "full" || type === "half",
      commonAncestors,
      shortestPath,
      explanation,
    };
  }

  // --- Category C: Direct Lineage (Grandparent / Grandchild / Great-...) ---
  // Check if p1 is ancestor of p2
  const ancestorsOfP2 = graph.getAncestors(personId2);
  const p1AsAncestor = ancestorsOfP2.find((a) => a.person.id === personId1);
  if (p1AsAncestor) {
    const gen = p1AsAncestor.generationDistance;
    let label = "";
    let category: RelationshipCategory = "grandparent";

    if (gen === 2) {
      category = "grandparent";
      // Check maternal vs paternal
      const intermediateParent = p1AsAncestor.viaRelationships[0]
        ? graph.getPerson(p1AsAncestor.viaRelationships[0].personId1)
        : null;

      const side = intermediateParent
        ? intermediateParent.gender === "male"
          ? "Paternal "
          : intermediateParent.gender === "female"
          ? "Maternal "
          : ""
        : "";

      const base = getGenderTerm(p1.gender, "Grandfather", "Grandmother", "Grandparent");
      label = `${side}${base}`;
    } else if (gen === 3) {
      category = "great-grandparent";
      label = `Great-${getGenderTerm(p1.gender, "Grandfather", "Grandmother", "Grandparent")}`;
    } else {
      category = "great-grandparent";
      const greats = "Great-".repeat(gen - 2);
      label = `${greats}${getGenderTerm(p1.gender, "Grandfather", "Grandmother", "Grandparent")}`;
    }

    if (p1AsAncestor.nature === "adoptive") label = `Adoptive ${label}`;
    if (p1AsAncestor.nature === "step") label = `Step-${label}`;

    return {
      person1: p1,
      person2: p2,
      label,
      category,
      nature: p1AsAncestor.nature,
      isBloodRelated: p1AsAncestor.nature === "biological",
      commonAncestors: [],
      shortestPath,
      explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (${gen} generations removed).`,
    };
  }

  // Check if p2 is ancestor of p1 (p1 is grandchild of p2)
  const ancestorsOfP1 = graph.getAncestors(personId1);
  const p2AsAncestor = ancestorsOfP1.find((a) => a.person.id === personId2);
  if (p2AsAncestor) {
    const gen = p2AsAncestor.generationDistance;
    let label = "";
    let category: RelationshipCategory = "grandchild";

    if (gen === 2) {
      category = "grandchild";
      label = getGenderTerm(p1.gender, "Grandson", "Granddaughter", "Grandchild");
    } else if (gen === 3) {
      category = "great-grandchild";
      label = `Great-${getGenderTerm(p1.gender, "Grandson", "Granddaughter", "Grandchild")}`;
    } else {
      category = "great-grandchild";
      const greats = "Great-".repeat(gen - 2);
      label = `${greats}${getGenderTerm(p1.gender, "Grandson", "Granddaughter", "Grandchild")}`;
    }

    if (p2AsAncestor.nature === "adoptive") label = `Adoptive ${label}`;
    if (p2AsAncestor.nature === "step") label = `Step-${label}`;

    return {
      person1: p1,
      person2: p2,
      label,
      category,
      nature: p2AsAncestor.nature,
      isBloodRelated: p2AsAncestor.nature === "biological",
      commonAncestors: [],
      shortestPath,
      explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name}.`,
    };
  }

  // --- Category D: Aunt / Uncle & Niece / Nephew ---
  // p1 is sibling of a parent of p2
  const parentsOfP2 = graph.getParents(personId2);
  for (const { person: parentOfP2 } of parentsOfP2) {
    const siblingsOfParent = graph.getSiblings(parentOfP2.id);
    const sibMatch = siblingsOfParent.find((s) => s.person.id === personId1);

    if (sibMatch) {
      const side =
        parentOfP2.gender === "male"
          ? "Paternal "
          : parentOfP2.gender === "female"
          ? "Maternal "
          : "";

      const base = getGenderTerm(p1.gender, "Uncle", "Aunt", "Aunt/Uncle");
      const label = `${side}${base}`;

      return {
        person1: p1,
        person2: p2,
        label,
        category: "aunt-uncle",
        nature: sibMatch.type === "step" ? "step" : sibMatch.type === "adoptive" ? "adoptive" : "biological",
        isBloodRelated: sibMatch.type === "full" || sibMatch.type === "half",
        commonAncestors,
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (sibling of ${getFullName(parentOfP2)}).`,
      };
    }
  }

  // p2 is sibling of a parent of p1 (p1 is niece/nephew of p2)
  const parentsOfP1 = graph.getParents(personId1);
  for (const { person: parentOfP1 } of parentsOfP1) {
    const siblingsOfParent = graph.getSiblings(parentOfP1.id);
    const sibMatch = siblingsOfParent.find((s) => s.person.id === personId2);

    if (sibMatch) {
      const label = getGenderTerm(p1.gender, "Nephew", "Niece", "Niece/Nephew");

      return {
        person1: p1,
        person2: p2,
        label,
        category: "niece-nephew",
        nature: sibMatch.type === "step" ? "step" : sibMatch.type === "adoptive" ? "adoptive" : "biological",
        isBloodRelated: sibMatch.type === "full" || sibMatch.type === "half",
        commonAncestors,
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (child of ${getFullName(parentOfP1)}).`,
      };
    }
  }

  // --- Category E: Cousins (Shared Common Ancestor) ---
  if (commonAncestors.length > 0) {
    // Lowest Common Ancestor (closest generation distance)
    const lca = commonAncestors[0];
    const d1 = lca.distance1;
    const d2 = lca.distance2;

    if (d1 >= 2 && d2 >= 2) {
      const degreeNumber = Math.min(d1, d2) - 1;
      const removedNumber = Math.abs(d1 - d2);

      let degreeStr = "";
      if (degreeNumber === 1) degreeStr = "First Cousin";
      else if (degreeNumber === 2) degreeStr = "Second Cousin";
      else if (degreeNumber === 3) degreeStr = "Third Cousin";
      else degreeStr = `${getOrdinal(degreeNumber)} Cousin`;

      let label = degreeStr;
      if (removedNumber === 1) {
        label = `${degreeStr} Once Removed`;
      } else if (removedNumber === 2) {
        label = `${degreeStr} Twice Removed`;
      } else if (removedNumber > 2) {
        label = `${degreeStr} ${removedNumber} Times Removed`;
      }

      const nature: ConnectionNature =
        lca.nature1 === "biological" && lca.nature2 === "biological"
          ? "biological"
          : "mixed";

      const ancestorName = getFullName(lca.ancestor);
      const explanation = `${p1Name} and ${p2Name} are ${label.toLowerCase()} through common ancestor ${ancestorName}.`;

      return {
        person1: p1,
        person2: p2,
        label,
        category: "cousin",
        nature,
        isBloodRelated: nature === "biological",
        degree: label,
        commonAncestors,
        shortestPath,
        explanation,
      };
    }
  }

  // --- Category F: In-Laws & Marriage-based Connections ---
  // 1. Spouse of child (Son-in-law / Daughter-in-law)
  const childrenOfP1 = graph.getChildren(personId1);
  for (const { person: child } of childrenOfP1) {
    const childSpouses = graph.getSpouses(child.id);
    if (childSpouses.some((s) => s.person.id === personId2)) {
      const label = getGenderTerm(p1.gender, "Father-in-law", "Mother-in-law", "Parent-in-law");
      return {
        person1: p1,
        person2: p2,
        label,
        category: "in-law",
        nature: "marriage",
        isBloodRelated: false,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (parent of ${getFullName(child)}).`,
      };
    }
  }

  // 2. Parent of spouse (Child-in-law)
  const spousesOfP1 = graph.getSpouses(personId1);
  for (const { person: spouse } of spousesOfP1) {
    const spouseParents = graph.getParents(spouse.id);
    if (spouseParents.some((p) => p.person.id === personId2)) {
      const label = getGenderTerm(p1.gender, "Son-in-law", "Daughter-in-law", "Child-in-law");
      return {
        person1: p1,
        person2: p2,
        label,
        category: "in-law",
        nature: "marriage",
        isBloodRelated: false,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (married to ${getFullName(spouse)}).`,
      };
    }
  }

  // 3. Sibling of spouse or Spouse of sibling (Brother-in-law / Sister-in-law)
  for (const { person: spouse } of spousesOfP1) {
    const spouseSiblings = graph.getSiblings(spouse.id);
    if (spouseSiblings.some((s) => s.person.id === personId2)) {
      const label = getGenderTerm(p1.gender, "Brother-in-law", "Sister-in-law", "Sibling-in-law");
      return {
        person1: p1,
        person2: p2,
        label,
        category: "in-law",
        nature: "marriage",
        isBloodRelated: false,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (married to their sibling ${getFullName(spouse)}).`,
      };
    }
  }

  for (const { person: sibling } of siblings) {
    const siblingSpouses = graph.getSpouses(sibling.id);
    if (siblingSpouses.some((s) => s.person.id === personId2)) {
      const label = getGenderTerm(p1.gender, "Brother-in-law", "Sister-in-law", "Sibling-in-law");
      return {
        person1: p1,
        person2: p2,
        label,
        category: "in-law",
        nature: "marriage",
        isBloodRelated: false,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (sibling of their partner ${getFullName(sibling)}).`,
      };
    }
  }

  // --- Category G: Step-Parent / Step-Child (via spouse of parent) ---
  for (const { person: parent } of parentsOfP1) {
    const parentSpouses = graph.getSpouses(parent.id);
    if (parentSpouses.some((s) => s.person.id === personId2)) {
      const label = getGenderTerm(p1.gender, "Step-Son", "Step-Daughter", "Step-Child");
      return {
        person1: p1,
        person2: p2,
        label,
        category: "step-family",
        nature: "step",
        isBloodRelated: false,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (child of ${getFullName(parent)}).`,
      };
    }
  }

  for (const { person: spouse } of spousesOfP1) {
    const spouseChildren = graph.getChildren(spouse.id);
    if (spouseChildren.some((c) => c.person.id === personId2)) {
      const label = getGenderTerm(p1.gender, "Step-Father", "Step-Mother", "Step-Parent");
      return {
        person1: p1,
        person2: p2,
        label,
        category: "step-family",
        nature: "step",
        isBloodRelated: false,
        commonAncestors: [],
        shortestPath,
        explanation: `${p1Name} is the ${label.toLowerCase()} of ${p2Name} (married to ${getFullName(spouse)}).`,
      };
    }
  }

  // --- Category H: General / Distant Connection ---
  // Format human-readable path string
  const pathSteps = shortestPath.map(
    (seg) => `${getFullName(seg.from)} → (${seg.stepDescription}) → ${getFullName(seg.to)}`
  );

  const explanation = `${p1Name} is connected to ${p2Name} through ${shortestPath.length} relationship steps: ${pathSteps.join("; ")}.`;

  return {
    person1: p1,
    person2: p2,
    label: `Connected Relative (${shortestPath.length} steps)`,
    category: "distant-connection",
    nature: "mixed",
    isBloodRelated: commonAncestors.length > 0,
    commonAncestors,
    shortestPath,
    explanation,
  };
}
