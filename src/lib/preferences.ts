"use client";

export type DateFormatOption = "YYYY-MM-DD" | "DD MMM YYYY" | "YYYY";
export type MaidenNameConvention = "parentheses" | "slash" | "birth_only";
export type DefaultViewMode = "standard" | "compact";

export interface AppPreferences {
  dateFormat: DateFormatOption;
  maidenNameConvention: MaidenNameConvention;
  defaultViewMode: DefaultViewMode;
  curatorName?: string;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  dateFormat: "YYYY-MM-DD",
  maidenNameConvention: "parentheses",
  defaultViewMode: "standard",
};

const STORAGE_KEY = "famtree_preferences";

export function getPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(updates: Partial<AppPreferences>): AppPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PREFERENCES, ...updates };
  }
  try {
    const current = getPreferences();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("famtree:preferences-changed", { detail: updated }));
    return updated;
  } catch {
    return { ...DEFAULT_PREFERENCES, ...updates };
  }
}
