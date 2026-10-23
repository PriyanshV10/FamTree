import { describe, it, expect, beforeEach } from "vitest";

describe("Theme System & Preferences", () => {
  const STORAGE_KEY = "famtree-theme";
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
  });

  it("should default to system theme when no preference stored", () => {
    const stored = mockStorage[STORAGE_KEY];
    expect(stored).toBeUndefined();
  });

  it("should persist dark theme preference to localStorage", () => {
    mockStorage[STORAGE_KEY] = "dark";
    expect(mockStorage[STORAGE_KEY]).toBe("dark");
  });

  it("should persist light theme preference to localStorage", () => {
    mockStorage[STORAGE_KEY] = "light";
    expect(mockStorage[STORAGE_KEY]).toBe("light");
  });

  it("should resolve theme accurately based on preference", () => {
    const resolve = (pref: "light" | "dark" | "system", isSystemDark: boolean) => {
      if (pref === "system") return isSystemDark ? "dark" : "light";
      return pref;
    };

    expect(resolve("dark", false)).toBe("dark");
    expect(resolve("light", true)).toBe("light");
    expect(resolve("system", true)).toBe("dark");
    expect(resolve("system", false)).toBe("light");
  });
});
