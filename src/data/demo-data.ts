import { FamilyTree, Person, Relationship } from "@/types";

/**
 * DEMONSTRATION DATA ONLY
 * This sample dataset is strictly separated from future Supabase persistence.
 * Used for Phase 1 UI shell and visualization demonstration.
 */

export const DEMO_TREES: FamilyTree[] = [
  {
    id: "tree-sterling-chen",
    name: "The Sterling-Chen Lineage",
    description: "Three generations of the Sterling and Chen families spanning Cambridge, San Francisco, and Edinburgh.",
    ownerName: "Maya Sterling-Chen",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-10-18T14:32:00Z",
    isDefault: true,
    coverColor: "bg-emerald-800",
    memberCount: 12,
    generationCount: 3,
  },
  {
    id: "tree-beaumont-vance",
    name: "The Beaumont & Vance Heritage",
    description: "Pioneering families in the Pacific Northwest dating back to early 20th century maritime history.",
    ownerName: "Eleanor Vance",
    createdAt: "2024-03-22T11:20:00Z",
    updatedAt: "2024-09-05T18:15:00Z",
    isDefault: false,
    coverColor: "bg-amber-800",
    memberCount: 6,
    generationCount: 2,
  },
];

export const DEMO_PEOPLE: Person[] = [
  // Generation 1: Paternal Grandparents
  {
    id: "person-1",
    treeId: "tree-sterling-chen",
    firstName: "Arthur",
    middleName: "James",
    lastName: "Sterling",
    gender: "male",
    birthDate: "1934-03-12",
    deathDate: "2018-11-20",
    isLiving: false,
    birthplace: "Edinburgh, Scotland",
    occupation: "Professor of Economic History",
    biography: "Arthur studied at the University of Edinburgh before emigrating to Massachusetts in 1958. Author of four books on maritime commerce.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-2",
    treeId: "tree-sterling-chen",
    firstName: "Eleanor",
    middleName: "Ruth",
    lastName: "Sterling",
    maidenName: "Vance",
    gender: "female",
    birthDate: "1938-06-25",
    deathDate: "2021-04-14",
    isLiving: false,
    birthplace: "Boston, MA",
    occupation: "Botanical Illustrator & Archivist",
    biography: "Eleanor worked for over three decades at the Arnold Arboretum, creating detailed watercolor studies of North American flora.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // Generation 1: Maternal Grandparents
  {
    id: "person-3",
    treeId: "tree-sterling-chen",
    firstName: "Wei",
    lastName: "Chen",
    displayName: "Dr. Wei Chen",
    gender: "male",
    birthDate: "1936-09-18",
    isLiving: true,
    birthplace: "Taipei, Taiwan",
    occupation: "Materials Science Engineer",
    biography: "Pioneer in ceramic composites. Emigrated to California in 1964 and holds twenty-six patents in aerospace heat shielding.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-4",
    treeId: "tree-sterling-chen",
    firstName: "Mei-Ling",
    lastName: "Chen",
    maidenName: "Wu",
    gender: "female",
    birthDate: "1940-12-04",
    deathDate: "2015-08-30",
    isLiving: false,
    birthplace: "Tainan, Taiwan",
    occupation: "Concert Pianist & Music Educator",
    biography: "Trained at the Juilliard School, Mei-Ling performed widely across North America and East Asia before establishing a community conservatory.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // Generation 2: Parents & Relatives
  {
    id: "person-5",
    treeId: "tree-sterling-chen",
    firstName: "David",
    middleName: "Arthur",
    lastName: "Sterling",
    gender: "male",
    birthDate: "1965-02-14",
    isLiving: true,
    birthplace: "Cambridge, MA",
    occupation: "Sustainable Urban Architect",
    biography: "Co-founder of Studio Verde in San Francisco, focusing on adaptive reuse of historic timber structures and net-zero civic centers.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-6",
    treeId: "tree-sterling-chen",
    firstName: "Hannah",
    middleName: "Shu-Fen",
    lastName: "Sterling-Chen",
    displayName: "Dr. Hannah Chen",
    maidenName: "Chen",
    gender: "female",
    birthDate: "1968-07-22",
    isLiving: true,
    birthplace: "San Francisco, CA",
    occupation: "Pediatric Cardiothoracic Surgeon",
    biography: "Chief of Pediatric Surgery at Bay Area Children's Hospital. Marathon runner and avid community orchard volunteer.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-7",
    treeId: "tree-sterling-chen",
    firstName: "Claire",
    middleName: "Marie",
    lastName: "Sterling",
    gender: "female",
    birthDate: "1969-11-08",
    isLiving: true,
    birthplace: "Cambridge, MA",
    occupation: "Wildlife Documentary Director",
    biography: "Emmy-nominated documentary filmmaker specializing in sub-polar marine ecosystems. Resides in Vancouver.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-8",
    treeId: "tree-sterling-chen",
    firstName: "Jonathan",
    middleName: "Kuo-Hua",
    lastName: "Chen",
    gender: "male",
    birthDate: "1972-04-03",
    isLiving: true,
    birthplace: "San Francisco, CA",
    occupation: "Clean Energy Policy Consultant",
    biography: "Advises municipal governments on grid electrification and coastal renewable storage infrastructure.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-9",
    treeId: "tree-sterling-chen",
    firstName: "Marcus",
    middleName: "Lee",
    lastName: "Reed",
    gender: "male",
    birthDate: "1970-10-19",
    isLiving: true,
    birthplace: "Seattle, WA",
    occupation: "Landscape Ecologist",
    biography: "Works on salmon habitat restoration in the Skagit River basin.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // Generation 3: Younger Generation
  {
    id: "person-10",
    treeId: "tree-sterling-chen",
    firstName: "Maya",
    middleName: "Lin",
    lastName: "Sterling-Chen",
    gender: "female",
    birthDate: "1998-05-16",
    isLiving: true,
    birthplace: "San Francisco, CA",
    occupation: "Software Engineer & Digital Artist",
    biography: "Creator of genealogical visualization projects and open-source civic tech tools. FamTree family curator.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-11",
    treeId: "tree-sterling-chen",
    firstName: "Julian",
    middleName: "Arthur",
    lastName: "Sterling-Chen",
    gender: "male",
    birthDate: "2002-09-30",
    isLiving: true,
    birthplace: "Oakland, CA",
    occupation: "Industrial Design Student",
    biography: "Currently studying at RISD with a focus on sustainable furniture craft and tactile user experiences.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "person-12",
    treeId: "tree-sterling-chen",
    firstName: "Leo",
    middleName: "Ze-Ming",
    lastName: "Reed-Chen",
    gender: "male",
    birthDate: "2008-01-14",
    isLiving: true,
    birthplace: "Seattle, WA",
    occupation: "High School Student & Robotics Builder",
    biography: "Passionate about competitive youth robotics and maritime bird identification.",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
];

export const DEMO_RELATIONSHIPS: Relationship[] = [
  // Generation 1 Spouses
  {
    id: "rel-1",
    treeId: "tree-sterling-chen",
    personId1: "person-1", // Arthur
    personId2: "person-2", // Eleanor
    type: "spouse",
    startDate: "1962-09-15",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-2",
    treeId: "tree-sterling-chen",
    personId1: "person-3", // Wei
    personId2: "person-4", // Mei-Ling
    type: "spouse",
    startDate: "1966-06-18",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // Arthur & Eleanor's Children
  {
    id: "rel-3",
    treeId: "tree-sterling-chen",
    personId1: "person-1", // Arthur
    personId2: "person-5", // David
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-4",
    treeId: "tree-sterling-chen",
    personId1: "person-2", // Eleanor
    personId2: "person-5", // David
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-5",
    treeId: "tree-sterling-chen",
    personId1: "person-1", // Arthur
    personId2: "person-7", // Claire
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-6",
    treeId: "tree-sterling-chen",
    personId1: "person-2", // Eleanor
    personId2: "person-7", // Claire
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // Wei & Mei-Ling's Children
  {
    id: "rel-7",
    treeId: "tree-sterling-chen",
    personId1: "person-3", // Wei
    personId2: "person-6", // Hannah
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-8",
    treeId: "tree-sterling-chen",
    personId1: "person-4", // Mei-Ling
    personId2: "person-6", // Hannah
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-9",
    treeId: "tree-sterling-chen",
    personId1: "person-3", // Wei
    personId2: "person-8", // Jonathan
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-10",
    treeId: "tree-sterling-chen",
    personId1: "person-4", // Mei-Ling
    personId2: "person-8", // Jonathan
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // Generation 2 Spouses
  {
    id: "rel-11",
    treeId: "tree-sterling-chen",
    personId1: "person-5", // David
    personId2: "person-6", // Hannah
    type: "spouse",
    startDate: "1995-10-14",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-12",
    treeId: "tree-sterling-chen",
    personId1: "person-8", // Jonathan
    personId2: "person-9", // Marcus
    type: "spouse",
    startDate: "2004-08-21",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // David & Hannah's Children
  {
    id: "rel-13",
    treeId: "tree-sterling-chen",
    personId1: "person-5", // David
    personId2: "person-10", // Maya
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-14",
    treeId: "tree-sterling-chen",
    personId1: "person-6", // Hannah
    personId2: "person-10", // Maya
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-15",
    treeId: "tree-sterling-chen",
    personId1: "person-5", // David
    personId2: "person-11", // Julian
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-16",
    treeId: "tree-sterling-chen",
    personId1: "person-6", // Hannah
    personId2: "person-11", // Julian
    type: "parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },

  // Jonathan & Marcus Adoptive Parent-Child
  {
    id: "rel-17",
    treeId: "tree-sterling-chen",
    personId1: "person-8", // Jonathan
    personId2: "person-12", // Leo
    type: "adoptive-parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "rel-18",
    treeId: "tree-sterling-chen",
    personId1: "person-9", // Marcus
    personId2: "person-12", // Leo
    type: "adoptive-parent-child",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
];

// Helper queries for demonstration mode
export function getDemoTree(id: string): FamilyTree | undefined {
  return DEMO_TREES.find((t) => t.id === id);
}

export function getDemoPeople(treeId: string): Person[] {
  return DEMO_PEOPLE.filter((p) => p.treeId === treeId);
}

export function getDemoPerson(personId: string): Person | undefined {
  return DEMO_PEOPLE.find((p) => p.id === personId);
}

export function getDemoRelationships(treeId: string): Relationship[] {
  return DEMO_RELATIONSHIPS.filter((r) => r.treeId === treeId);
}

export function getImmediateRelatives(personId: string, treeId: string) {
  const rels = getDemoRelationships(treeId);
  const peopleMap = new Map(getDemoPeople(treeId).map((p) => [p.id, p]));

  const parents: Person[] = [];
  const children: Person[] = [];
  const spouses: Person[] = [];
  const parentIds = new Set<string>();

  for (const rel of rels) {
    if (
      (rel.type === "parent-child" ||
        rel.type === "adoptive-parent-child" ||
        rel.type === "step-parent-child") &&
      rel.personId2 === personId
    ) {
      const parent = peopleMap.get(rel.personId1);
      if (parent) {
        parents.push(parent);
        parentIds.add(parent.id);
      }
    }

    if (
      (rel.type === "parent-child" ||
        rel.type === "adoptive-parent-child" ||
        rel.type === "step-parent-child") &&
      rel.personId1 === personId
    ) {
      const child = peopleMap.get(rel.personId2);
      if (child) children.push(child);
    }

    if (rel.type === "spouse" || rel.type === "former-spouse") {
      if (rel.personId1 === personId) {
        const spouse = peopleMap.get(rel.personId2);
        if (spouse) spouses.push(spouse);
      } else if (rel.personId2 === personId) {
        const spouse = peopleMap.get(rel.personId1);
        if (spouse) spouses.push(spouse);
      }
    }
  }

  // Find siblings (share at least one parent)
  const siblings: Person[] = [];
  const siblingIds = new Set<string>();

  if (parentIds.size > 0) {
    for (const rel of rels) {
      if (
        (rel.type === "parent-child" || rel.type === "adoptive-parent-child") &&
        parentIds.has(rel.personId1) &&
        rel.personId2 !== personId &&
        !siblingIds.has(rel.personId2)
      ) {
        siblingIds.add(rel.personId2);
        const sibling = peopleMap.get(rel.personId2);
        if (sibling) siblings.push(sibling);
      }
    }
  }

  return {
    parents,
    children,
    spouses,
    siblings,
  };
}
