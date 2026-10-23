import { describe, it, expect } from "vitest";
import {
  validateDates,
  validatePerson,
  validateRelationship,
  hasAncestryCycle,
} from "@/domain/validation";
import { Person, Relationship } from "@/domain/types";

describe("Domain Validation", () => {
  describe("Date Validation", () => {
    it("accepts valid chronological birth and death dates", () => {
      const result = validateDates("1945-05-12", "2010-08-20", false);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts partial year dates in correct order", () => {
      const result = validateDates("1945", "2010", false);
      expect(result.isValid).toBe(true);
    });

    it("accepts year-only birth date for living person", () => {
      const result = validateDates("1948", undefined, true);
      expect(result.isValid).toBe(true);
    });

    it("accepts year-month format for birth and death", () => {
      const result = validateDates("1948-05", "2020-11", false);
      expect(result.isValid).toBe(true);
    });

    it("rejects partial death year earlier than partial birth year", () => {
      const result = validateDates("1950", "1940", false);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("DEATH_BEFORE_BIRTH");
    });

    it("rejects death date earlier than birth date", () => {
      const result = validateDates("1980-01-01", "1975-12-31", false);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("DEATH_BEFORE_BIRTH");
    });

    it("rejects death date in the same year but earlier month", () => {
      const result = validateDates("1980-06-15", "1980-03-10", false);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("DEATH_BEFORE_BIRTH");
    });

    it("rejects living person with a recorded death date", () => {
      const result = validateDates("1990-01-01", "2020-01-01", true);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("LIVING_WITH_DEATH_DATE");
    });

    it("permits unknown death dates for deceased persons without errors", () => {
      const result = validateDates("1850", undefined, false);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Person Validation", () => {
    it("validates required first and last names", () => {
      const valid = validatePerson({
        treeId: "t1",
        firstName: "Ada",
        lastName: "Lovelace",
      });
      expect(valid.isValid).toBe(true);

      const invalidFirst = validatePerson({
        treeId: "t1",
        firstName: "",
        lastName: "Lovelace",
      });
      expect(invalidFirst.isValid).toBe(false);

      const invalidLast = validatePerson({
        treeId: "t1",
        firstName: "Ada",
        lastName: " ",
      });
      expect(invalidLast.isValid).toBe(false);
    });
  });

  describe("Relationship Validation & Cycle Prevention", () => {
    const pA: Person = {
      id: "pA",
      treeId: "tree-1",
      firstName: "Person",
      lastName: "A",
      gender: "male",
      isLiving: true,
      createdAt: "",
      updatedAt: "",
    };
    const pB: Person = {
      id: "pB",
      treeId: "tree-1",
      firstName: "Person",
      lastName: "B",
      gender: "female",
      isLiving: true,
      createdAt: "",
      updatedAt: "",
    };
    const pC: Person = {
      id: "pC",
      treeId: "tree-1",
      firstName: "Person",
      lastName: "C",
      gender: "other",
      isLiving: true,
      createdAt: "",
      updatedAt: "",
    };

    const peopleMap = new Map([
      ["pA", pA],
      ["pB", pB],
      ["pC", pC],
    ]);

    it("prevents self-relationships", () => {
      const result = validateRelationship(
        { treeId: "tree-1", personId1: "pA", personId2: "pA", type: "parent-child" },
        [],
        peopleMap
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("SELF_RELATIONSHIP");
    });

    it("prevents relationships with nonexistent people", () => {
      const result = validateRelationship(
        { treeId: "tree-1", personId1: "pA", personId2: "ghost", type: "parent-child" },
        [],
        peopleMap
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("NONEXISTENT_PERSON");
    });

    it("prevents duplicate relationships", () => {
      const existing: Relationship[] = [
        {
          id: "r1",
          treeId: "tree-1",
          personId1: "pA",
          personId2: "pB",
          type: "parent-child",
          createdAt: "",
          updatedAt: "",
        },
      ];

      const dup = validateRelationship(
        { treeId: "tree-1", personId1: "pA", personId2: "pB", type: "parent-child" },
        existing,
        peopleMap
      );
      expect(dup.isValid).toBe(false);
      expect(dup.errors[0].code).toBe("DUPLICATE_RELATIONSHIP");
    });

    it("detects direct ancestry cycles (A is parent of B, attempting B is parent of A)", () => {
      const existing: Relationship[] = [
        {
          id: "r1",
          treeId: "tree-1",
          personId1: "pA", // A is parent of B
          personId2: "pB",
          type: "parent-child",
          createdAt: "",
          updatedAt: "",
        },
      ];

      // Now propose B as parent of A
      const hasCycle = hasAncestryCycle("pB", "pA", existing);
      expect(hasCycle).toBe(true);

      const validation = validateRelationship(
        { treeId: "tree-1", personId1: "pB", personId2: "pA", type: "parent-child" },
        existing,
        peopleMap
      );
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe("ANCESTRY_CYCLE");
    });

    it("detects multi-hop ancestry cycles (A -> B -> C, attempting C is parent of A)", () => {
      const existing: Relationship[] = [
        {
          id: "r1",
          treeId: "tree-1",
          personId1: "pA", // A -> B
          personId2: "pB",
          type: "parent-child",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "r2",
          treeId: "tree-1",
          personId1: "pB", // B -> C
          personId2: "pC",
          type: "parent-child",
          createdAt: "",
          updatedAt: "",
        },
      ];

      // Propose C as parent of A -> would create C -> A -> B -> C cycle!
      expect(hasAncestryCycle("pC", "pA", existing)).toBe(true);

      const validation = validateRelationship(
        { treeId: "tree-1", personId1: "pC", personId2: "pA", type: "parent-child" },
        existing,
        peopleMap
      );
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe("ANCESTRY_CYCLE");
    });

    it("allows valid multi-parent and blended family structures without cycle errors", () => {
      // pA and pB are both parents of pC
      const existing: Relationship[] = [
        {
          id: "r1",
          treeId: "tree-1",
          personId1: "pA",
          personId2: "pC",
          type: "parent-child",
          createdAt: "",
          updatedAt: "",
        },
      ];

      // Add pB as second parent of pC
      const validation = validateRelationship(
        { treeId: "tree-1", personId1: "pB", personId2: "pC", type: "parent-child" },
        existing,
        peopleMap
      );
      expect(validation.isValid).toBe(true);
    });
  });
});
