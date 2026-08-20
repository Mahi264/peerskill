/**
 * Generates a clean, normalized URL slug for a skill name.
 * Handles programming language symbols (e.g. C++, C#, .NET) cleanly
 * to avoid slug collisions with base skill names (e.g. C).
 */
export function generateSkillSlug(name: string): string {
  let clean = name.trim().toLowerCase();

  // Explicitly map common programming symbol skill names
  clean = clean
    .replace(/c\+\+/g, "c-plus-plus")
    .replace(/c#/g, "c-sharp")
    .replace(/\.net/g, "dot-net")
    .replace(/\+/g, "-plus-")
    .replace(/#/g, "-sharp-");

  // Standard non-alphanumeric replacement
  let slug = clean
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    slug = `skill-${Date.now()}`;
  }

  return slug;
}
