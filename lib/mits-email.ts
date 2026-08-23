export interface MitsEmailParseResult {
  isValidDomain: boolean;
  batchYear: number | null;
  expectedGraduationYear: number | null;
  branchCode: string | null;
  branchName: string | null;
}

/**
 * Known MITS branch/program code mappings.
 * Note: Represents BRANCH / PROGRAM, not Department.
 */
export const MITS_BRANCH_MAP: Record<string, string> = {
  cs: "Computer Science & Engineering (CSE)",
  cd: "Computer Science & Design (CSD)",
  it: "Information Technology (IT)",
  mc: "Mathematics & Computing",
  am: "Artificial Intelligence & Machine Learning (AI-ML)",
  ad: "Artificial Intelligence & Data Science (AI-DS)",
  io: "Internet of Things (IoT)",
  ai: "Artificial Intelligence (AI)",
  ec: "Electronics & Communication Engineering (ECE)",
  ee: "Electrical Engineering (EE)",
  me: "Mechanical Engineering (ME)",
  ce: "Civil Engineering (CE)",
  ch: "Chemical Engineering (CHE)",
};

/**
 * Computes expected graduation year from batch (admission) year for standard 4-year B.Tech programs.
 * Example:
 * Batch 2024 -> Expected Graduation 2028 (Class of 2028).
 */
export function getExpectedGraduationYear(batchYear: number | null | undefined): number | null {
  if (!batchYear || typeof batchYear !== "number" || batchYear < 2000 || batchYear > 2100) {
    return null;
  }
  return batchYear + 4;
}

/**
 * Parses a verified MITS email address (@mitsgwl.ac.in) to extract
 * batch year, expected graduation year, and program/branch.
 *
 * Supported Patterns:
 * 1. Standard Short Format: 24cs10mo80@mitsgwl.ac.in, 25mc1ar22@mitsgwl.ac.in, 23it10un71@mitsgwl.ac.in
 *    - Leading 2 digits: YY (e.g. 24 -> 2024 batch)
 *    - Expected graduation for standard 4-year B.Tech: 2024 + 4 = 2028 (Class of 2028)
 *    - Next 2-3 letters: branch code (e.g. cs, mc, it, am, ad, io, ai, cd)
 *
 * 2. Institutional Roll Format: 0101cs241065@mitsgwl.ac.in
 *    - 0101 prefix + branch code + 2 digits batch year (24 -> 2024 batch, 2028 graduation)
 */
export function parseMitsEmail(email: string): MitsEmailParseResult {
  const clean = (email || "").trim().toLowerCase();
  const domain = "mitsgwl.ac.in";

  if (!clean.endsWith(`@${domain}`)) {
    return {
      isValidDomain: false,
      batchYear: null,
      expectedGraduationYear: null,
      branchCode: null,
      branchName: null,
    };
  }

  const localPart = clean.split("@")[0];

  let batchYear: number | null = null;
  let branchCode: string | null = null;

  // Pattern 1: Leading 2 digits + letters (e.g. 24cs10mo80, 25am1pe49, 23it10un71)
  const pattern1 = /^(\d{2})([a-z]{2,3})/i;
  const match1 = localPart.match(pattern1);

  if (match1) {
    const rawYear = Number.parseInt(match1[1], 10);
    if (!Number.isNaN(rawYear)) {
      // 2000s batch year (admission year)
      batchYear = 2000 + rawYear;
    }
    branchCode = match1[2].toLowerCase();
  } else {
    // Pattern 2: 0101 + branch code + 2 digits batch year (e.g. 0101cs241065)
    const pattern2 = /^0101([a-z]{2,3})(\d{2})/i;
    const match2 = localPart.match(pattern2);

    if (match2) {
      branchCode = match2[1].toLowerCase();
      const rawYear = Number.parseInt(match2[2], 10);
      if (!Number.isNaN(rawYear)) {
        batchYear = 2000 + rawYear;
      }
    }
  }

  const branchName = branchCode && MITS_BRANCH_MAP[branchCode] ? MITS_BRANCH_MAP[branchCode] : null;
  const expectedGraduationYear = getExpectedGraduationYear(batchYear);

  return {
    isValidDomain: true,
    batchYear,
    expectedGraduationYear,
    branchCode,
    branchName,
  };
}

/**
 * MITS roll number prefix regex:
 * 1. Degree-based roll (e.g. BTCS24O1080, BTCS24O1077, BTIT23O1071, BTCS24L1005, MTCS241001)
 * 2. Enrollment roll (e.g. 0101CS241080, 0101IT23L1012, 0101EC221045)
 * 3. Short email roll prefix (e.g. 24CS10MO80, 24CD3DSU4, 25AM1PE49)
 */
const MITS_ROLL_PREFIX_REGEX =
  /^(?:(?:BT|MT|BC|MC|MB)[A-Z]{2,4}\d{2}[A-Z0-9]{2,10}|0101[A-Z]{2,4}\d{2}[A-Z0-9]{1,10}|\d{2}[A-Z]{2,3}[A-Z0-9]{3,10})\s+(.+)$/i;

/**
 * Normalizes Google OIDC display names by stripping institutional MITS roll number prefixes.
 * Examples:
 * - "BTCS24O1080 MOHIT SHARMA" -> "MOHIT SHARMA"
 * - "BTCS24O1077 MAHI GUPTA" -> "MAHI GUPTA"
 * - "0101CS241080 MOHIT SHARMA" -> "MOHIT SHARMA"
 * - "MOHIT SHARMA" -> "MOHIT SHARMA"
 */
export function normalizeMitsDisplayName(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";

  const match = trimmed.match(MITS_ROLL_PREFIX_REGEX);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }

  return trimmed;
}
