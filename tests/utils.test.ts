import { describe, it, expect } from "vitest";
import {
  cn,
  getPersonFullName,
  getInitials,
  formatDateRange,
  getAvatarColor,
  formatDateByPreference,
} from "@/lib/utils";
import { Person } from "@/types";

describe("Utils Library", () => {
  it("merges tailwind class names correctly", () => {
    expect(cn("px-2 py-1", "bg-white", { "text-black": true })).toContain("bg-white");
  });

  it("formats person full name and maiden name", () => {
    const person: Person = {
      id: "p1",
      treeId: "t1",
      firstName: "Eleanor",
      middleName: "Ruth",
      lastName: "Sterling",
      maidenName: "Vance",
      gender: "female",
      isLiving: false,
      createdAt: "",
      updatedAt: "",
    };

    expect(getPersonFullName(person)).toBe("Eleanor Ruth Sterling (née Vance)");
  });

  it("handles display name overrides", () => {
    const person: Person = {
      id: "p2",
      treeId: "t1",
      firstName: "Wei",
      lastName: "Chen",
      displayName: "Dr. Wei Chen",
      gender: "male",
      isLiving: true,
      createdAt: "",
      updatedAt: "",
    };

    expect(getPersonFullName(person)).toBe("Dr. Wei Chen");
  });

  it("extracts initials correctly", () => {
    expect(getInitials("Arthur Sterling")).toBe("AS");
    expect(getInitials("Maya Lin Sterling-Chen")).toBe("MS");
    expect(getInitials("Cher")).toBe("CH");
    expect(getInitials("")).toBe("?");
  });

  it("formats date ranges for living and deceased individuals", () => {
    expect(formatDateRange("1934-03-12", "2018-11-20", false)).toBe("1934 – 2018");
    expect(formatDateRange("1965-02-14", undefined, true)).toBe("b. 1965");
    expect(formatDateRange(undefined, undefined, true)).toBe("Living");
  });

  it("generates deterministic avatar colors", () => {
    const color1 = getAvatarColor("person-1");
    const color2 = getAvatarColor("person-1");
    expect(color1).toBe(color2);
  });

  it("respects maiden name conventions", () => {
    const person: Person = {
      id: "p1",
      treeId: "t1",
      firstName: "Eleanor",
      middleName: "Ruth",
      lastName: "Sterling",
      maidenName: "Vance",
      gender: "female",
      isLiving: false,
      createdAt: "",
      updatedAt: "",
    };

    expect(getPersonFullName(person, true, "parentheses")).toBe(
      "Eleanor Ruth Sterling (née Vance)"
    );
    expect(getPersonFullName(person, true, "slash")).toBe("Eleanor Ruth Sterling / Vance");
    expect(getPersonFullName(person, true, "birth_only")).toBe("Eleanor Ruth Vance");
  });

  it("formats dates according to preference option", () => {
    const date = "1934-03-12";
    expect(formatDateByPreference(date, "YYYY-MM-DD")).toBe("1934-03-12");
    expect(formatDateByPreference(date, "DD MMM YYYY")).toBe("12 Mar 1934");
    expect(formatDateByPreference(date, "YYYY")).toBe("1934");
  });
});
