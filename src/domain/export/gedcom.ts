import { FamilyTree, Person, Relationship, Gender } from "@/types";
import { createId, getCurrentTimestamp } from "@/lib/utils";

/**
 * Format an ISO date (e.g. "1948-04-12" or "1948") into GEDCOM standard date string (e.g. "12 APR 1948" or "1948").
 */
export function formatGedcomDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const parts = dateStr.trim().split("-");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  if (parts.length === 3) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const month = months[monthIdx] || parts[1];
    return `${day} ${month} ${year}`;
  } else if (parts.length === 2) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const month = months[monthIdx] || parts[1];
    return `${month} ${year}`;
  } else if (parts.length === 1 && parts[0]) {
    return parts[0];
  }
  return dateStr;
}

/**
 * Parse a GEDCOM date string (e.g. "12 APR 1948", "APR 1948", or "1948") into ISO YYYY-MM-DD or YYYY.
 */
export function parseGedcomDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 3) {
    // DD MMM YYYY
    const day = tokens[0].padStart(2, "0");
    const m = months[tokens[1].toUpperCase()] || "01";
    const year = tokens[2];
    return `${year}-${m}-${day}`;
  } else if (tokens.length === 2) {
    // MMM YYYY
    const m = months[tokens[0].toUpperCase()] || "01";
    const year = tokens[1];
    return `${year}-${m}`;
  } else if (tokens.length === 1 && /^\d{4}$/.test(tokens[0])) {
    return tokens[0];
  }
  return trimmed;
}

/**
 * Map Person gender to GEDCOM standard SEX code (M, F, U).
 */
export function genderToGedcomSex(gender: Gender): string {
  switch (gender) {
    case "male":
      return "M";
    case "female":
      return "F";
    default:
      return "U";
  }
}

/**
 * Map GEDCOM SEX code to Gender.
 */
export function gedcomSexToGender(sex?: string): Gender {
  if (!sex) return "unknown";
  const upper = sex.trim().toUpperCase();
  if (upper === "M") return "male";
  if (upper === "F") return "female";
  if (upper === "O") return "other";
  return "unknown";
}

/**
 * Export tree, persons, and relationships to a standard GEDCOM 5.5.1 formatted file string.
 */
export function exportToGedcom(
  tree?: Partial<FamilyTree>,
  people: Person[] = [],
  relationships: Relationship[] = []
): string {
  const lines: string[] = [];

  // 1. Header
  lines.push("0 HEAD");
  lines.push("1 SOUR FamTree");
  lines.push("2 VERS 1.0.0");
  lines.push("2 NAME FamTree Genealogy System");
  lines.push("1 DEST ANY");
  lines.push(`1 DATE ${new Date().toISOString().split("T")[0]}`);
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("2 FORM LINEAGE-LINKED");
  lines.push("1 CHAR UTF-8");
  if (tree?.name) {
    lines.push(`1 NOTE Lineage: ${tree.name}`);
  }

  // Map person ID to internal GEDCOM xref ID: @I1@, @I2@, etc.
  const personToXref = new Map<string, string>();
  people.forEach((p, index) => {
    personToXref.set(p.id, `@I${index + 1}@`);
  });

  // Group family units (marriages/partnerships and their children)
  // Structure: husband, wife, children[], relType, notes
  interface FamUnit {
    id: string;
    husbandId?: string;
    wifeId?: string;
    partner1Id: string;
    partner2Id?: string;
    childIds: string[];
    isFormerSpouse?: boolean;
    marriageDate?: string;
    notes?: string;
  }

  const famUnits: FamUnit[] = [];
  const processedSpouseRels = new Set<string>();

  // Process spouse / partner pairs
  for (const rel of relationships) {
    if (rel.type === "spouse" || rel.type === "former-spouse") {
      const relKey = [rel.personId1, rel.personId2].sort().join("-");
      if (processedSpouseRels.has(relKey)) continue;
      processedSpouseRels.add(relKey);

      const p1 = people.find((p) => p.id === rel.personId1);
      const p2 = people.find((p) => p.id === rel.personId2);

      let husbandId: string | undefined;
      let wifeId: string | undefined;

      if (p1?.gender === "male" && p2?.gender === "female") {
        husbandId = p1.id;
        wifeId = p2.id;
      } else if (p1?.gender === "female" && p2?.gender === "male") {
        husbandId = p2.id;
        wifeId = p1.id;
      } else {
        // Same-sex or unknown gender partners
        husbandId = p1?.id;
        wifeId = p2?.id;
      }

      famUnits.push({
        id: `@F${famUnits.length + 1}@`,
        husbandId,
        wifeId,
        partner1Id: rel.personId1,
        partner2Id: rel.personId2,
        childIds: [],
        isFormerSpouse: rel.type === "former-spouse",
        marriageDate: rel.startDate,
        notes: rel.notes,
      });
    }
  }

  // Group children into family units or single-parent units
  const parentToChildren = new Map<string, string[]>();
  for (const rel of relationships) {
    if (
      rel.type === "parent-child" ||
      rel.type === "adoptive-parent-child" ||
      rel.type === "step-parent-child"
    ) {
      const parentId = rel.personId1;
      const childId = rel.personId2;
      const current = parentToChildren.get(parentId) || [];
      if (!current.includes(childId)) {
        current.push(childId);
        parentToChildren.set(parentId, current);
      }
    }
  }

  // Attach children to matching spouse family unit if both parents match, or single parent unit
  const childToParents = new Map<string, string[]>();
  for (const rel of relationships) {
    if (
      rel.type === "parent-child" ||
      rel.type === "adoptive-parent-child" ||
      rel.type === "step-parent-child"
    ) {
      const parents = childToParents.get(rel.personId2) || [];
      if (!parents.includes(rel.personId1)) {
        parents.push(rel.personId1);
        childToParents.set(rel.personId2, parents);
      }
    }
  }

  const assignedChildren = new Set<string>();

  // Attach children whose both parents belong to a spouse family unit
  for (const fam of famUnits) {
    if (fam.partner1Id && fam.partner2Id) {
      const p1Children = new Set(parentToChildren.get(fam.partner1Id) || []);
      const p2Children = new Set(parentToChildren.get(fam.partner2Id) || []);
      for (const childId of p1Children) {
        if (p2Children.has(childId)) {
          if (!fam.childIds.includes(childId)) {
            fam.childIds.push(childId);
            assignedChildren.add(`${fam.partner1Id}-${childId}`);
            assignedChildren.add(`${fam.partner2Id}-${childId}`);
          }
        }
      }
    }
  }

  // For remaining single-parent or non-spouse parent-child links, create single-parent family units
  for (const [parentId, children] of parentToChildren.entries()) {
    const unassigned = children.filter((childId) => !assignedChildren.has(`${parentId}-${childId}`));
    if (unassigned.length > 0) {
      const p = people.find((item) => item.id === parentId);
      famUnits.push({
        id: `@F${famUnits.length + 1}@`,
        husbandId: p?.gender === "female" ? undefined : parentId,
        wifeId: p?.gender === "female" ? parentId : undefined,
        partner1Id: parentId,
        childIds: unassigned,
      });
    }
  }

  // 2. Export Individual (INDI) Records
  for (const person of people) {
    const xref = personToXref.get(person.id) || `@I${person.id}@`;
    lines.push(`0 ${xref} INDI`);

    // Name
    const firstName = [person.firstName, person.middleName].filter(Boolean).join(" ");
    const lastName = person.lastName || "";
    lines.push(`1 NAME ${firstName} /${lastName}/`);
    if (firstName) lines.push(`2 GIVN ${firstName}`);
    if (lastName) lines.push(`2 SURN ${lastName}`);
    if (person.maidenName) lines.push(`2 _MARNM ${person.maidenName}`);
    if (person.displayName) lines.push(`2 _ALIA ${person.displayName}`);

    // Gender
    lines.push(`1 SEX ${genderToGedcomSex(person.gender)}`);

    // Birth
    if (person.birthDate || person.birthplace) {
      lines.push("1 BIRT");
      if (person.birthDate) {
        lines.push(`2 DATE ${formatGedcomDate(person.birthDate)}`);
      }
      if (person.birthplace) {
        lines.push(`2 PLAC ${person.birthplace}`);
      }
    }

    // Death
    if (!person.isLiving || person.deathDate) {
      lines.push("1 DEAT");
      if (person.deathDate) {
        lines.push(`2 DATE ${formatGedcomDate(person.deathDate)}`);
      } else {
        lines.push("2 DATE Y");
      }
    }

    // Occupation
    if (person.occupation) {
      lines.push(`1 OCCU ${person.occupation}`);
    }

    // Biography / Notes
    if (person.biography) {
      lines.push(`1 NOTE ${person.biography.replace(/\r?\n/g, " ")}`);
    }

    // Family links: FAMS (Family as spouse/partner) and FAMC (Family as child)
    for (const fam of famUnits) {
      if (fam.partner1Id === person.id || fam.partner2Id === person.id) {
        lines.push(`1 FAMS ${fam.id}`);
      }
      if (fam.childIds.includes(person.id)) {
        lines.push(`1 FAMC ${fam.id}`);
      }
    }
  }

  // 3. Export Family (FAM) Records
  for (const fam of famUnits) {
    lines.push(`0 ${fam.id} FAM`);
    if (fam.husbandId && personToXref.has(fam.husbandId)) {
      lines.push(`1 HUSB ${personToXref.get(fam.husbandId)}`);
    }
    if (fam.wifeId && personToXref.has(fam.wifeId)) {
      lines.push(`1 WIFE ${personToXref.get(fam.wifeId)}`);
    }
    for (const childId of fam.childIds) {
      if (personToXref.has(childId)) {
        lines.push(`1 CHIL ${personToXref.get(childId)}`);
      }
    }
    if (fam.marriageDate) {
      lines.push("1 MARR");
      lines.push(`2 DATE ${formatGedcomDate(fam.marriageDate)}`);
    }
    if (fam.isFormerSpouse) {
      lines.push("1 DIV");
    }
    if (fam.notes) {
      lines.push(`1 NOTE ${fam.notes}`);
    }
  }

  // 4. Trailer
  lines.push("0 TRLR");

  return lines.join("\n") + "\n";
}

/**
 * Import a GEDCOM 5.5.1 formatted file and convert into FamTree Person and Relationship records.
 */
export function importFromGedcom(
  gedcomText: string,
  targetTreeId: string
): { people: Person[]; relationships: Relationship[] } {
  const lines = gedcomText.split(/\r?\n/);

  interface RawIndi {
    xref: string;
    name?: string;
    given?: string;
    surname?: string;
    sex?: string;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    isDeceased?: boolean;
    occupation?: string;
    note?: string;
  }

  interface RawFam {
    xref: string;
    husbandXref?: string;
    wifeXref?: string;
    childXrefs: string[];
    marrDate?: string;
    isDivorced?: boolean;
    note?: string;
  }

  const rawIndis = new Map<string, RawIndi>();
  const rawFams = new Map<string, RawFam>();

  let currentIndi: RawIndi | null = null;
  let currentFam: RawFam | null = null;
  let currentContext: "BIRT" | "DEAT" | "MARR" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Parse level, xref/tag, and value
    // Formats:
    // "0 @I1@ INDI"
    // "0 @F1@ FAM"
    // "1 NAME John /Doe/"
    // "2 DATE 12 APR 1948"
    const match = line.match(/^(\d+)\s+(@[^@]+@|[A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const p2 = match[2];
    const value = match[3] || "";

    if (level === 0) {
      currentContext = null;
      if (value === "INDI") {
        currentIndi = { xref: p2, childXrefs: [] } as unknown as RawIndi;
        rawIndis.set(p2, currentIndi);
        currentFam = null;
      } else if (value === "FAM") {
        currentFam = { xref: p2, childXrefs: [] };
        rawFams.set(p2, currentFam);
        currentIndi = null;
      } else {
        currentIndi = null;
        currentFam = null;
      }
      continue;
    }

    if (currentIndi) {
      if (level === 1) {
        currentContext = null;
        if (p2 === "NAME") {
          currentIndi.name = value;
          const slashMatch = value.match(/(.*?)\s*\/(.*?)\//);
          if (slashMatch) {
            currentIndi.given = slashMatch[1].trim();
            currentIndi.surname = slashMatch[2].trim();
          } else {
            currentIndi.given = value;
          }
        } else if (p2 === "GIVN") {
          currentIndi.given = value;
        } else if (p2 === "SURN") {
          currentIndi.surname = value;
        } else if (p2 === "SEX") {
          currentIndi.sex = value;
        } else if (p2 === "BIRT") {
          currentContext = "BIRT";
        } else if (p2 === "DEAT") {
          currentContext = "DEAT";
          currentIndi.isDeceased = true;
        } else if (p2 === "OCCU") {
          currentIndi.occupation = value;
        } else if (p2 === "NOTE") {
          currentIndi.note = value;
        }
      } else if (level === 2 && currentContext) {
        if (currentContext === "BIRT") {
          if (p2 === "DATE") currentIndi.birthDate = parseGedcomDate(value);
          if (p2 === "PLAC") currentIndi.birthPlace = value;
        } else if (currentContext === "DEAT") {
          if (p2 === "DATE") {
            currentIndi.deathDate = value === "Y" ? undefined : parseGedcomDate(value);
            currentIndi.isDeceased = true;
          }
        }
      }
    } else if (currentFam) {
      if (level === 1) {
        currentContext = null;
        if (p2 === "HUSB") {
          currentFam.husbandXref = value;
        } else if (p2 === "WIFE") {
          currentFam.wifeXref = value;
        } else if (p2 === "CHIL") {
          currentFam.childXrefs.push(value);
        } else if (p2 === "MARR") {
          currentContext = "MARR";
        } else if (p2 === "DIV") {
          currentFam.isDivorced = true;
        } else if (p2 === "NOTE") {
          currentFam.note = value;
        }
      } else if (level === 2 && currentContext === "MARR") {
        if (p2 === "DATE") {
          currentFam.marrDate = parseGedcomDate(value);
        }
      }
    }
  }

  // Convert raw records into FamTree domain entities
  const xrefToPersonId = new Map<string, string>();
  const people: Person[] = [];
  const now = getCurrentTimestamp();

  for (const raw of rawIndis.values()) {
    const personId = createId("person");
    xrefToPersonId.set(raw.xref, personId);

    const nameParts = (raw.given || "").split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || (raw.name ? raw.name.replace(/\//g, "").trim() : "Unknown");
    const middleName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
    const lastName = raw.surname || "";

    const person: Person = {
      id: personId,
      treeId: targetTreeId,
      firstName,
      middleName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      gender: gedcomSexToGender(raw.sex),
      birthDate: raw.birthDate,
      deathDate: raw.deathDate,
      isLiving: !raw.isDeceased && !raw.deathDate,
      birthplace: raw.birthPlace,
      occupation: raw.occupation,
      biography: raw.note,
      createdAt: now,
      updatedAt: now,
    };
    people.push(person);
  }

  const relationships: Relationship[] = [];
  const processedSpouses = new Set<string>();

  for (const fam of rawFams.values()) {
    const hId = fam.husbandXref ? xrefToPersonId.get(fam.husbandXref) : undefined;
    const wId = fam.wifeXref ? xrefToPersonId.get(fam.wifeXref) : undefined;

    // Spousal relationship
    if (hId && wId) {
      const spouseKey = [hId, wId].sort().join("-");
      if (!processedSpouses.has(spouseKey)) {
        processedSpouses.add(spouseKey);
        relationships.push({
          id: createId("rel"),
          treeId: targetTreeId,
          personId1: hId,
          personId2: wId,
          type: fam.isDivorced ? "former-spouse" : "spouse",
          startDate: fam.marrDate,
          notes: fam.note,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Parent-child relationships
    const parents = [hId, wId].filter(Boolean) as string[];
    for (const childXref of fam.childXrefs) {
      const cId = xrefToPersonId.get(childXref);
      if (!cId) continue;

      for (const parentId of parents) {
        relationships.push({
          id: createId("rel"),
          treeId: targetTreeId,
          personId1: parentId,
          personId2: cId,
          type: "parent-child",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  return { people, relationships };
}
