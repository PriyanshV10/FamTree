export type Gender = 'male' | 'female' | 'other' | 'unknown';

export type RelationshipType =
  | 'parent-child'
  | 'adoptive-parent-child'
  | 'step-parent-child'
  | 'spouse'
  | 'former-spouse';

export interface Person {
  id: string;
  treeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  displayName?: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  isLiving: boolean;
  birthplace?: string;
  occupation?: string;
  biography?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  treeId: string;
  personId1: string; // Parent in parent-child, or first partner in spouse
  personId2: string; // Child in parent-child, or second partner in spouse
  type: RelationshipType;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyTree {
  id: string;
  name: string;
  description: string;
  ownerId?: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  coverColor?: string;
  memberCount?: number;
  generationCount?: number;
}

export interface CreatePersonInput {
  id?: string;
  treeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  displayName?: string;
  gender?: Gender;
  birthDate?: string;
  deathDate?: string;
  isLiving?: boolean;
  birthplace?: string;
  occupation?: string;
  biography?: string;
  photoUrl?: string;
}

export interface UpdatePersonInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  maidenName?: string;
  displayName?: string;
  gender?: Gender;
  birthDate?: string;
  deathDate?: string;
  isLiving?: boolean;
  birthplace?: string;
  occupation?: string;
  biography?: string;
  photoUrl?: string;
}

export interface CreateRelationshipInput {
  id?: string;
  treeId: string;
  personId1: string;
  personId2: string;
  type: RelationshipType;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export type ConnectionNature =
  | 'biological'
  | 'adoptive'
  | 'step'
  | 'marriage'
  | 'mixed'
  | 'none';

export interface AncestorInfo {
  person: Person;
  generationDistance: number;
  nature: ConnectionNature;
  viaRelationships: Relationship[];
}

export interface DescendantInfo {
  person: Person;
  generationDistance: number;
  nature: ConnectionNature;
  viaRelationships: Relationship[];
}

export interface CommonAncestor {
  ancestor: Person;
  distance1: number;
  distance2: number;
  nature1: ConnectionNature;
  nature2: ConnectionNature;
}

export type PathDirection =
  | 'parent-to-child'
  | 'child-to-parent'
  | 'spouse'
  | 'former-spouse';

export interface PathSegment {
  from: Person;
  to: Person;
  relationship: Relationship;
  direction: PathDirection;
  stepDescription: string;
}

export type RelationshipCategory =
  | 'self'
  | 'parent'
  | 'child'
  | 'spouse'
  | 'former-spouse'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'great-grandparent'
  | 'great-grandchild'
  | 'aunt-uncle'
  | 'niece-nephew'
  | 'cousin'
  | 'in-law'
  | 'step-family'
  | 'adoptive-family'
  | 'distant-connection'
  | 'unrelated';

export interface RelationshipResolution {
  person1: Person;
  person2: Person;
  label: string;
  category: RelationshipCategory;
  nature: ConnectionNature;
  isBloodRelated: boolean;
  degree?: string;
  commonAncestors: CommonAncestor[];
  shortestPath: PathSegment[];
  explanation: string;
  alternativePaths?: {
    label: string;
    explanation: string;
    path: PathSegment[];
  }[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
