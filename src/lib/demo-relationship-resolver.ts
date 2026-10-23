import {
  Person,
  Relationship,
  RelationshipDiscoveryResult,
  RelationshipPathStep,
} from "@/types";
import { FamilyGraph } from "@/domain/family-graph";
import { resolveRelationship } from "@/domain/relationship-engine";

/**
 * Phase 3 Relationship Resolver Adapter.
 * Backed by the real deterministic domain engine.
 */
export function resolveDemoRelationship(
  person1: Person,
  person2: Person,
  people: Person[],
  relationships: Relationship[]
): RelationshipDiscoveryResult {
  const graph = new FamilyGraph(person1.treeId, people, relationships);
  const result = resolveRelationship(graph, person1.id, person2.id);

  const pathSteps: RelationshipPathStep[] = result.shortestPath.map((seg) => ({
    fromPerson: seg.from,
    toPerson: seg.to,
    stepDescription: seg.stepDescription,
    type: seg.relationship.type,
  }));

  return {
    person1: result.person1,
    person2: result.person2,
    relationshipLabel: result.label,
    degree: result.degree,
    commonAncestors: result.commonAncestors.map((ca) => ca.ancestor),
    path: pathSteps,
    explanation: result.explanation,
  };
}
