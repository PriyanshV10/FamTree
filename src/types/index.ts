export * from "@/domain/types";

import { Person, RelationshipType } from "@/domain/types";

export interface RelationshipPathStep {
  fromPerson: Person;
  toPerson: Person;
  stepDescription: string;
  type: RelationshipType;
}

export interface RelationshipDiscoveryResult {
  person1: Person;
  person2: Person;
  relationshipLabel: string;
  degree?: string;
  commonAncestors: Person[];
  path: RelationshipPathStep[];
  explanation: string;
}

export interface TreeNodeData extends Record<string, unknown> {
  person: Person;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isCompact?: boolean;
  isCardHoverTarget?: boolean;
  isRelativeHighlighted?: boolean;
  isDimmed?: boolean;
  isReferencePerson?: boolean;
  generation?: number;
  spouseNames?: string[];
  parentsCount?: number;
  childrenCount?: number;
  onSelect?: (person: Person) => void;
  onViewProfile?: (personId: string) => void;
  onFindRelationship?: (person: Person) => void;
  onHighlightAncestors?: (person: Person) => void;
  onHighlightDescendants?: (person: Person) => void;
}
