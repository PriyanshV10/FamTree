import { describe, it, expect, beforeEach } from "vitest";
import { FamilyGraph } from "@/domain/family-graph";
import { resolveRelationship } from "@/domain/relationship-engine";

describe("Deterministic Relationship Engine", () => {
  let graph: FamilyGraph;

  beforeEach(() => {
    graph = new FamilyGraph("tree-engine-test");
  });

  describe("Basic Relationships", () => {
    it("resolves self correctly", () => {
      const p = graph.addPerson({ treeId: "tree-engine-test", firstName: "Self", lastName: "Person" });
      const res = resolveRelationship(graph, p.id, p.id);
      expect(res.category).toBe("self");
      expect(res.label).toBe("Self");
    });

    it("resolves father, mother, son, and daughter with correct gender terms", () => {
      const dad = graph.addPerson({ treeId: "tree-engine-test", firstName: "John", lastName: "Smith", gender: "male" });
      const mom = graph.addPerson({ treeId: "tree-engine-test", firstName: "Mary", lastName: "Smith", gender: "female" });
      const son = graph.addPerson({ treeId: "tree-engine-test", firstName: "Luke", lastName: "Smith", gender: "male" });
      const dau = graph.addPerson({ treeId: "tree-engine-test", firstName: "Anna", lastName: "Smith", gender: "female" });

      graph.addRelationship({ treeId: "tree-engine-test", personId1: dad.id, personId2: son.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: mom.id, personId2: dau.id, type: "parent-child" });

      // dad to son -> Father
      const resDad = resolveRelationship(graph, dad.id, son.id);
      expect(resDad.label).toBe("Father");
      expect(resDad.category).toBe("parent");
      expect(resDad.isBloodRelated).toBe(true);

      // son to dad -> Son
      const resSon = resolveRelationship(graph, son.id, dad.id);
      expect(resSon.label).toBe("Son");
      expect(resSon.category).toBe("child");

      // mom to dau -> Mother
      const resMom = resolveRelationship(graph, mom.id, dau.id);
      expect(resMom.label).toBe("Mother");

      // dau to mom -> Daughter
      const resDau = resolveRelationship(graph, dau.id, mom.id);
      expect(resDau.label).toBe("Daughter");
    });

    it("resolves husband, wife, and former spouse", () => {
      const h = graph.addPerson({ treeId: "tree-engine-test", firstName: "Robert", lastName: "Evans", gender: "male" });
      const w = graph.addPerson({ treeId: "tree-engine-test", firstName: "Susan", lastName: "Evans", gender: "female" });

      graph.addRelationship({ treeId: "tree-engine-test", personId1: h.id, personId2: w.id, type: "spouse" });

      const resH = resolveRelationship(graph, h.id, w.id);
      expect(resH.label).toBe("Husband");
      expect(resH.category).toBe("spouse");
      expect(resH.nature).toBe("marriage");

      const resW = resolveRelationship(graph, w.id, h.id);
      expect(resW.label).toBe("Wife");
    });

    it("resolves full siblings and half-siblings", () => {
      const dad = graph.addPerson({ treeId: "tree-engine-test", firstName: "Dad", lastName: "Test", gender: "male" });
      const mom = graph.addPerson({ treeId: "tree-engine-test", firstName: "Mom", lastName: "Test", gender: "female" });
      const b1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Brother", lastName: "Test", gender: "male" });
      const s1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Sister", lastName: "Test", gender: "female" });

      // Brother and Sister share both parents
      graph.addRelationship({ treeId: "tree-engine-test", personId1: dad.id, personId2: b1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: mom.id, personId2: b1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: dad.id, personId2: s1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: mom.id, personId2: s1.id, type: "parent-child" });

      const resBtoS = resolveRelationship(graph, b1.id, s1.id);
      expect(resBtoS.label).toBe("Brother");
      expect(resBtoS.category).toBe("sibling");

      const resStoB = resolveRelationship(graph, s1.id, b1.id);
      expect(resStoB.label).toBe("Sister");

      // Add half brother via dad and new partner
      const mom2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Mom2", lastName: "Test", gender: "female" });
      const halfBro = graph.addPerson({ treeId: "tree-engine-test", firstName: "HalfBro", lastName: "Test", gender: "male" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: dad.id, personId2: halfBro.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: mom2.id, personId2: halfBro.id, type: "parent-child" });

      const resHalf = resolveRelationship(graph, halfBro.id, b1.id);
      expect(resHalf.label).toBe("Half-Brother");
      expect(resHalf.category).toBe("sibling");
    });
  });

  describe("Multi-Generation Lineage", () => {
    it("resolves paternal/maternal grandfather and grandmother", () => {
      // Paternal Grandfather
      const patGF = graph.addPerson({ treeId: "tree-engine-test", firstName: "Paternal", lastName: "Grandpa", gender: "male" });
      const dad = graph.addPerson({ treeId: "tree-engine-test", firstName: "Father", lastName: "Test", gender: "male" });
      const child = graph.addPerson({ treeId: "tree-engine-test", firstName: "Grandson", lastName: "Test", gender: "male" });

      graph.addRelationship({ treeId: "tree-engine-test", personId1: patGF.id, personId2: dad.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: dad.id, personId2: child.id, type: "parent-child" });

      const resGF = resolveRelationship(graph, patGF.id, child.id);
      expect(resGF.label).toBe("Paternal Grandfather");
      expect(resGF.category).toBe("grandparent");

      const resGS = resolveRelationship(graph, child.id, patGF.id);
      expect(resGS.label).toBe("Grandson");
      expect(resGS.category).toBe("grandchild");
    });

    it("resolves great-grandparent and great-grandchild", () => {
      const ggp = graph.addPerson({ treeId: "tree-engine-test", firstName: "Great", lastName: "Grandma", gender: "female" });
      const gp = graph.addPerson({ treeId: "tree-engine-test", firstName: "Grandpa", lastName: "Test", gender: "male" });
      const p = graph.addPerson({ treeId: "tree-engine-test", firstName: "Dad", lastName: "Test", gender: "male" });
      const c = graph.addPerson({ treeId: "tree-engine-test", firstName: "GreatGrandchild", lastName: "Test", gender: "female" });

      graph.addRelationship({ treeId: "tree-engine-test", personId1: ggp.id, personId2: gp.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gp.id, personId2: p.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: p.id, personId2: c.id, type: "parent-child" });

      const resGGP = resolveRelationship(graph, ggp.id, c.id);
      expect(resGGP.label).toBe("Great-Grandmother");
      expect(resGGP.category).toBe("great-grandparent");

      const resGGC = resolveRelationship(graph, c.id, ggp.id);
      expect(resGGC.label).toBe("Great-Granddaughter");
      expect(resGGC.category).toBe("great-grandchild");
    });
  });

  describe("Aunts, Uncles, Nieces, and Nephews", () => {
    it("resolves uncle and niece/nephew", () => {
      const gf = graph.addPerson({ treeId: "tree-engine-test", firstName: "Grandfather", lastName: "Test", gender: "male" });
      const gm = graph.addPerson({ treeId: "tree-engine-test", firstName: "Grandmother", lastName: "Test", gender: "female" });

      const uncle = graph.addPerson({ treeId: "tree-engine-test", firstName: "Uncle", lastName: "Bob", gender: "male" });
      const mother = graph.addPerson({ treeId: "tree-engine-test", firstName: "Mother", lastName: "Test", gender: "female" });
      const niece = graph.addPerson({ treeId: "tree-engine-test", firstName: "Niece", lastName: "Emily", gender: "female" });

      // Grandparents have Uncle and Mother
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gf.id, personId2: uncle.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gm.id, personId2: uncle.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gf.id, personId2: mother.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gm.id, personId2: mother.id, type: "parent-child" });

      // Mother has Niece Emily
      graph.addRelationship({ treeId: "tree-engine-test", personId1: mother.id, personId2: niece.id, type: "parent-child" });

      const resUncle = resolveRelationship(graph, uncle.id, niece.id);
      expect(resUncle.label).toBe("Maternal Uncle");
      expect(resUncle.category).toBe("aunt-uncle");

      const resNiece = resolveRelationship(graph, niece.id, uncle.id);
      expect(resNiece.label).toBe("Niece");
      expect(resNiece.category).toBe("niece-nephew");
    });
  });

  describe("Cousins and Common Ancestor Degrees", () => {
    it("resolves first cousins sharing grandparents (d1=2, d2=2)", () => {
      const gp = graph.addPerson({ treeId: "tree-engine-test", firstName: "Common", lastName: "Grandparent" });

      const p1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Parent", lastName: "One" });
      const p2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Parent", lastName: "Two" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gp.id, personId2: p1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gp.id, personId2: p2.id, type: "parent-child" });

      const c1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Cousin", lastName: "A" });
      const c2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Cousin", lastName: "B" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: p1.id, personId2: c1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: p2.id, personId2: c2.id, type: "parent-child" });

      const res = resolveRelationship(graph, c1.id, c2.id);
      expect(res.label).toBe("First Cousin");
      expect(res.category).toBe("cousin");
      expect(res.commonAncestors).toHaveLength(1);
      expect(res.commonAncestors[0].ancestor.id).toBe(gp.id);
    });

    it("resolves first cousin once removed (d1=2, d2=3)", () => {
      const gp = graph.addPerson({ treeId: "tree-engine-test", firstName: "Common", lastName: "Ancestor" });

      const p1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Parent", lastName: "A" });
      const p2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Parent", lastName: "B" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gp.id, personId2: p1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gp.id, personId2: p2.id, type: "parent-child" });

      // Cousin 1 is child of p1 (d1 = 2)
      const c1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Cousin", lastName: "Generation2" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: p1.id, personId2: c1.id, type: "parent-child" });

      // Cousin 2 is child of p2 (d = 2), and has child c2Child (d2 = 3)
      const c2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "Cousin", lastName: "Peer" });
      const c2Child = graph.addPerson({ treeId: "tree-engine-test", firstName: "ChildOfCousin", lastName: "Generation3" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: p2.id, personId2: c2.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: c2.id, personId2: c2Child.id, type: "parent-child" });

      const res = resolveRelationship(graph, c1.id, c2Child.id);
      expect(res.label).toBe("First Cousin Once Removed");
      expect(res.category).toBe("cousin");
    });

    it("resolves second cousins sharing great-grandparents (d1=3, d2=3)", () => {
      const ggp = graph.addPerson({ treeId: "tree-engine-test", firstName: "Great", lastName: "Ancestor" });

      const gp1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "GP", lastName: "1" });
      const gp2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "GP", lastName: "2" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: ggp.id, personId2: gp1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: ggp.id, personId2: gp2.id, type: "parent-child" });

      const p1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "P", lastName: "1" });
      const p2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "P", lastName: "2" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gp1.id, personId2: p1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: gp2.id, personId2: p2.id, type: "parent-child" });

      const sc1 = graph.addPerson({ treeId: "tree-engine-test", firstName: "SecondCousin", lastName: "A" });
      const sc2 = graph.addPerson({ treeId: "tree-engine-test", firstName: "SecondCousin", lastName: "B" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: p1.id, personId2: sc1.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: p2.id, personId2: sc2.id, type: "parent-child" });

      const res = resolveRelationship(graph, sc1.id, sc2.id);
      expect(res.label).toBe("Second Cousin");
      expect(res.category).toBe("cousin");
    });
  });

  describe("In-Laws and Marriage Connections", () => {
    it("resolves father-in-law and daughter-in-law", () => {
      const fil = graph.addPerson({ treeId: "tree-engine-test", firstName: "Father", lastName: "InLaw", gender: "male" });
      const son = graph.addPerson({ treeId: "tree-engine-test", firstName: "Son", lastName: "InLaw", gender: "male" });
      const dil = graph.addPerson({ treeId: "tree-engine-test", firstName: "Daughter", lastName: "InLaw", gender: "female" });

      graph.addRelationship({ treeId: "tree-engine-test", personId1: fil.id, personId2: son.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: son.id, personId2: dil.id, type: "spouse" });

      const resFil = resolveRelationship(graph, fil.id, dil.id);
      expect(resFil.label).toBe("Father-in-law");
      expect(resFil.category).toBe("in-law");

      const resDil = resolveRelationship(graph, dil.id, fil.id);
      expect(resDil.label).toBe("Daughter-in-law");
      expect(resDil.category).toBe("in-law");
    });

    it("resolves brother-in-law and sister-in-law", () => {
      const husband = graph.addPerson({ treeId: "tree-engine-test", firstName: "Husband", lastName: "User", gender: "male" });
      const wife = graph.addPerson({ treeId: "tree-engine-test", firstName: "Wife", lastName: "User", gender: "female" });
      const brother = graph.addPerson({ treeId: "tree-engine-test", firstName: "WifesBrother", lastName: "User", gender: "male" });
      const parent = graph.addPerson({ treeId: "tree-engine-test", firstName: "Parent", lastName: "User" });

      graph.addRelationship({ treeId: "tree-engine-test", personId1: husband.id, personId2: wife.id, type: "spouse" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: parent.id, personId2: wife.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: parent.id, personId2: brother.id, type: "parent-child" });

      const resBil = resolveRelationship(graph, brother.id, husband.id);
      expect(resBil.label).toBe("Brother-in-law");
      expect(resBil.category).toBe("in-law");
    });
  });

  describe("Adoptive and Step-Family Cases", () => {
    it("distinguishes adoptive father and adoptive child", () => {
      const adoptDad = graph.addPerson({ treeId: "tree-engine-test", firstName: "Adoptive", lastName: "Dad", gender: "male" });
      const child = graph.addPerson({ treeId: "tree-engine-test", firstName: "Adopted", lastName: "Child", gender: "female" });

      graph.addRelationship({
        treeId: "tree-engine-test",
        personId1: adoptDad.id,
        personId2: child.id,
        type: "adoptive-parent-child",
      });

      const resDad = resolveRelationship(graph, adoptDad.id, child.id);
      expect(resDad.label).toBe("Adoptive Father");
      expect(resDad.nature).toBe("adoptive");
      expect(resDad.isBloodRelated).toBe(false);

      const resChild = resolveRelationship(graph, child.id, adoptDad.id);
      expect(resChild.label).toBe("Adoptive Daughter");
    });

    it("resolves step-father and step-son without conflating as biological", () => {
      const bioMom = graph.addPerson({ treeId: "tree-engine-test", firstName: "Bio", lastName: "Mom", gender: "female" });
      const stepDad = graph.addPerson({ treeId: "tree-engine-test", firstName: "Step", lastName: "Dad", gender: "male" });
      const son = graph.addPerson({ treeId: "tree-engine-test", firstName: "Son", lastName: "User", gender: "male" });

      graph.addRelationship({ treeId: "tree-engine-test", personId1: bioMom.id, personId2: son.id, type: "parent-child" });
      graph.addRelationship({ treeId: "tree-engine-test", personId1: bioMom.id, personId2: stepDad.id, type: "spouse" });

      const resStep = resolveRelationship(graph, stepDad.id, son.id);
      expect(resStep.label).toBe("Step-Father");
      expect(resStep.category).toBe("step-family");
      expect(resStep.isBloodRelated).toBe(false);
    });
  });

  describe("Disconnected Graphs, Missing People, and Edge Cases", () => {
    it("handles disconnected branches in the same tree", () => {
      const a = graph.addPerson({ treeId: "tree-engine-test", firstName: "Branch1", lastName: "Person" });
      const b = graph.addPerson({ treeId: "tree-engine-test", firstName: "Branch2", lastName: "Person" });

      const res = resolveRelationship(graph, a.id, b.id);
      expect(res.category).toBe("unrelated");
      expect(res.shortestPath).toHaveLength(0);
      expect(res.explanation).toContain("No recorded relationship connects");
    });

    it("handles missing people gracefully", () => {
      const a = graph.addPerson({ treeId: "tree-engine-test", firstName: "Existing", lastName: "Person" });
      const res = resolveRelationship(graph, a.id, "ghost-id");

      expect(res.label).toBe("Unknown Person");
      expect(res.explanation).toContain("does not exist");
    });

    it("handles unknown dates and incomplete historical parentage", () => {
      const parent = graph.addPerson({
        treeId: "tree-engine-test",
        firstName: "Ancient",
        lastName: "Ancestor",
        gender: "unknown",
        // no birthDate, no deathDate
      });
      const child = graph.addPerson({
        treeId: "tree-engine-test",
        firstName: "Descendant",
        lastName: "Ancestor",
        gender: "unknown",
      });

      graph.addRelationship({
        treeId: "tree-engine-test",
        personId1: parent.id,
        personId2: child.id,
        type: "parent-child",
      });

      const res = resolveRelationship(graph, parent.id, child.id);
      expect(res.label).toBe("Parent");
      expect(res.isBloodRelated).toBe(true);
    });
  });
});
