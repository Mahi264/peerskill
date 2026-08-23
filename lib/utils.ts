import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats public campus peer academic identity subtitle.
 * Rule:
 * - Branch / Program is shown prominently (e.g. "Computer Science & Engineering (CSE)").
 * - Section is shown only when set (e.g. " • Section A").
 * - Graduation year may be appended if present (e.g. " • Class of 2028").
 *
 * Examples:
 * - branch="Computer Science & Engineering (CSE)", section="A" -> "Computer Science & Engineering (CSE) • Section A"
 * - branch="Computer Science & Engineering (CSE)", section=null -> "Computer Science & Engineering (CSE)"
 * - branch="Information Technology (IT)", section="B", graduationYear=2028 -> "Information Technology (IT) • Section B • Class of 2028"
 */
export function formatPublicPeerAcademicSubtitle(profile: {
  branch?: string | null;
  section?: string | null;
  graduationYear?: number | null;
}): string {
  const primaryAcademic = profile.branch?.trim() || "Campus Student";
  const parts: string[] = [primaryAcademic];

  if (profile.section?.trim()) {
    parts.push(`Section ${profile.section.trim()}`);
  }

  if (profile.graduationYear) {
    parts.push(`Class of ${profile.graduationYear}`);
  }

  return parts.join(" • ");
}
