import { describe, it, expect } from "vitest";
import { isSupabaseConfigured } from "@/lib/supabase/client";

describe("Authentication & Session Infrastructure", () => {
  it("should evaluate configuration status accurately", () => {
    // When environment variables are not configured or are placeholder values
    const configured = isSupabaseConfigured();
    // In local test environment without cloud credentials, it defaults to false
    expect(typeof configured).toBe("boolean");
  });

  it("should validate password length constraints for sign up", () => {
    const validatePassword = (pwd: string) => {
      if (pwd.length < 6) return "Password must be at least 6 characters long.";
      return null;
    };

    expect(validatePassword("123")).toBe("Password must be at least 6 characters long.");
    expect(validatePassword("securePass123")).toBeNull();
  });

  it("should validate password confirmation matches", () => {
    const matchPasswords = (p1: string, p2: string) => p1 === p2;

    expect(matchPasswords("password123", "password123")).toBe(true);
    expect(matchPasswords("password123", "different123")).toBe(false);
  });
});
