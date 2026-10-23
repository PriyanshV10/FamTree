import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Person } from "@/types";
import { getPreferences, MaidenNameConvention, DateFormatOption } from "@/lib/preferences";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPersonFullName(
  person: Person,
  includeMaiden = true,
  maidenConvention?: MaidenNameConvention
): string {
  if (person.displayName) return person.displayName;
  const convention =
    maidenConvention ||
    (typeof window !== "undefined"
      ? getPreferences().maidenNameConvention
      : "parentheses");

  if (convention === "birth_only" && person.maidenName) {
    const parts = [person.firstName, person.middleName, person.maidenName].filter(Boolean);
    return parts.join(" ");
  }

  const parts = [person.firstName, person.middleName, person.lastName].filter(Boolean);
  const fullName = parts.join(" ");
  if (includeMaiden && person.maidenName && person.maidenName !== person.lastName) {
    if (convention === "slash") {
      return `${fullName} / ${person.maidenName}`;
    }
    return `${fullName} (née ${person.maidenName})`;
  }
  return fullName;
}

export function formatDateByPreference(
  dateStr?: string,
  preferredFormat?: DateFormatOption
): string {
  if (!dateStr) return "";
  const format =
    preferredFormat ||
    (typeof window !== "undefined" ? getPreferences().dateFormat : "YYYY-MM-DD");

  const ymdMatch = dateStr.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!ymdMatch) return dateStr;

  const [, year, month, day] = ymdMatch;
  if (format === "YYYY" || !month) {
    return year;
  }

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const mIndex = parseInt(month, 10) - 1;
  const monthName = months[mIndex] || month;

  if (format === "DD MMM YYYY") {
    return day ? `${parseInt(day, 10)} ${monthName} ${year}` : `${monthName} ${year}`;
  }

  return day ? `${year}-${month}-${day}` : `${year}-${month}`;
}

export function getInitials(name: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function formatDateRange(
  birthDate?: string,
  deathDate?: string,
  isLiving: boolean = true
): string {
  const getYear = (d?: string) => {
    if (!d) return null;
    const match = d.match(/\b\d{4}\b/);
    return match ? match[0] : d;
  };

  const birthYear = getYear(birthDate);
  const deathYear = getYear(deathDate);

  if (birthYear && deathYear) {
    return `${birthYear} – ${deathYear}`;
  }
  if (birthYear) {
    return isLiving ? `b. ${birthYear}` : `${birthYear} – d. unknown`;
  }
  if (deathYear) {
    return `d. ${deathYear}`;
  }
  return isLiving ? "Living" : "Deceased";
}

export function getAvatarColor(seed: string): string {
  const palettes = [
    "bg-emerald-100 text-emerald-800 border-emerald-300",
    "bg-stone-200 text-stone-800 border-stone-300",
    "bg-amber-100 text-amber-800 border-amber-300",
    "bg-teal-100 text-teal-800 border-teal-300",
    "bg-sky-100 text-sky-800 border-sky-300",
    "bg-rose-100 text-rose-800 border-rose-300",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

export function createId(prefix: string = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Checks if a string is a valid year (YYYY), year-month (YYYY-MM), or full date (YYYY-MM-DD).
 */
export function isValidFlexibleDate(val?: string): boolean {
  if (!val || val.trim() === "") return true;
  const trimmed = val.trim();
  const match = trimmed.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  if (year < 100 || year > 2500) return false;
  if (match[2] !== undefined) {
    const month = parseInt(match[2], 10);
    if (month < 1 || month > 12) return false;
  }
  if (match[3] !== undefined) {
    const day = parseInt(match[3], 10);
    if (day < 1 || day > 31) return false;
  }
  return true;
}

/**
 * Normalizes date parts to ISO format padding (e.g. 1948-5 -> 1948-05).
 */
export function normalizeFlexibleDate(val?: string): string | undefined {
  if (!val || val.trim() === "") return undefined;
  const trimmed = val.trim();
  const match = trimmed.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!match) return trimmed;
  const year = match[1];
  const month = match[2] ? match[2].padStart(2, "0") : undefined;
  const day = match[3] ? match[3].padStart(2, "0") : undefined;
  if (month && day) return `${year}-${month}-${day}`;
  if (month) return `${year}-${month}`;
  return year;
}

