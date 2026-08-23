import { describe, expect, it } from "vitest";

import {
  getExpectedGraduationYear,
  normalizeMitsDisplayName,
  parseMitsEmail,
} from "@/lib/mits-email";

describe("MITS Email Parser (Academic Identity & Graduation Calculation)", () => {
  it("parses known CSE email correctly and computes expected graduation year (2024 batch -> 2028 graduation)", () => {
    const res = parseMitsEmail("24cs10mo80@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2024);
    expect(res.expectedGraduationYear).toBe(2028);
    expect(res.expectedGraduationYear).not.toBe(res.batchYear);
    expect(res.branchCode).toBe("cs");
    expect(res.branchName).toBe("Computer Science & Engineering (CSE)");
  });

  it("calculates expected graduation year as batchYear + 4 for 4-year B.Tech programs", () => {
    expect(getExpectedGraduationYear(2024)).toBe(2028);
    expect(getExpectedGraduationYear(2025)).toBe(2029);
    expect(getExpectedGraduationYear(2023)).toBe(2027);
    expect(getExpectedGraduationYear(null)).toBeNull();
    expect(getExpectedGraduationYear(undefined)).toBeNull();
  });

  it("parses known CSD email correctly", () => {
    const res = parseMitsEmail("24cd3dsu4@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2024);
    expect(res.expectedGraduationYear).toBe(2028);
    expect(res.branchCode).toBe("cd");
    expect(res.branchName).toBe("Computer Science & Design (CSD)");
  });

  it("parses known IT email correctly", () => {
    const res = parseMitsEmail("24it3dam3@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2024);
    expect(res.expectedGraduationYear).toBe(2028);
    expect(res.branchCode).toBe("it");
    expect(res.branchName).toBe("Information Technology (IT)");
  });

  it("parses known MnC email correctly", () => {
    const res = parseMitsEmail("25mc1ar22@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2025);
    expect(res.expectedGraduationYear).toBe(2029);
    expect(res.branchCode).toBe("mc");
    expect(res.branchName).toBe("Mathematics & Computing");
  });

  it("parses known AI-ML email correctly", () => {
    const res = parseMitsEmail("25am1pe49@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2025);
    expect(res.expectedGraduationYear).toBe(2029);
    expect(res.branchCode).toBe("am");
    expect(res.branchName).toBe("Artificial Intelligence & Machine Learning (AI-ML)");
  });

  it("parses known AI-DS email correctly", () => {
    const res = parseMitsEmail("25ad1su72@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2025);
    expect(res.expectedGraduationYear).toBe(2029);
    expect(res.branchCode).toBe("ad");
    expect(res.branchName).toBe("Artificial Intelligence & Data Science (AI-DS)");
  });

  it("parses known IoT email correctly", () => {
    const res = parseMitsEmail("25io1sn125@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2025);
    expect(res.expectedGraduationYear).toBe(2029);
    expect(res.branchCode).toBe("io");
    expect(res.branchName).toBe("Internet of Things (IoT)");
  });

  it("parses known AI email correctly", () => {
    const res = parseMitsEmail("24ai10sh65@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2024);
    expect(res.expectedGraduationYear).toBe(2028);
    expect(res.branchCode).toBe("ai");
    expect(res.branchName).toBe("Artificial Intelligence (AI)");
  });

  it("parses enrollment roll format with 0101 prefix", () => {
    const res = parseMitsEmail("0101cs241065@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2024);
    expect(res.expectedGraduationYear).toBe(2028);
    expect(res.branchCode).toBe("cs");
    expect(res.branchName).toBe("Computer Science & Engineering (CSE)");
  });

  it("extracts batch year while leaving unknown branch code unresolved without guessing", () => {
    const res = parseMitsEmail("24zz99xx@mitsgwl.ac.in");
    expect(res.isValidDomain).toBe(true);
    expect(res.batchYear).toBe(2024);
    expect(res.expectedGraduationYear).toBe(2028);
    expect(res.branchCode).toBe("zz");
    expect(res.branchName).toBeNull();
  });

  it("handles non-institutional domains safely", () => {
    const res = parseMitsEmail("student@gmail.com");
    expect(res.isValidDomain).toBe(false);
    expect(res.batchYear).toBeNull();
    expect(res.expectedGraduationYear).toBeNull();
    expect(res.branchCode).toBeNull();
    expect(res.branchName).toBeNull();
  });
});

describe("normalizeMitsDisplayName (Display Name Normalization)", () => {
  it("normalizes standard B.Tech CSE Google name with roll prefix", () => {
    expect(normalizeMitsDisplayName("BTCS24O1080 MOHIT SHARMA")).toBe("MOHIT SHARMA");
    expect(normalizeMitsDisplayName("BTCS24O1077 MAHI GUPTA")).toBe("MAHI GUPTA");
  });

  it("normalizes other degree and branch roll formats", () => {
    expect(normalizeMitsDisplayName("BTIT23O1071 AMIT SHARMA")).toBe("AMIT SHARMA");
    expect(normalizeMitsDisplayName("BTCD24O1004 NEHA SINGH")).toBe("NEHA SINGH");
    expect(normalizeMitsDisplayName("BTMC25O1015 ADITYA JOSHI")).toBe("ADITYA JOSHI");
  });

  it("normalizes enrollment roll format with 0101 prefix", () => {
    expect(normalizeMitsDisplayName("0101CS241080 MOHIT SHARMA")).toBe("MOHIT SHARMA");
    expect(normalizeMitsDisplayName("0101EC221045 SHIVAM PATEL")).toBe("SHIVAM PATEL");
  });

  it("normalizes lateral-entry roll format examples", () => {
    expect(normalizeMitsDisplayName("BTCS24L1005 RAHUL VERMA")).toBe("RAHUL VERMA");
    expect(normalizeMitsDisplayName("0101IT23L1012 PRIYA JAIN")).toBe("PRIYA JAIN");
  });

  it("normalizes email-style short roll prefixes", () => {
    expect(normalizeMitsDisplayName("24CS10MO80 MOHIT SHARMA")).toBe("MOHIT SHARMA");
  });

  it("leaves Google names without roll prefix unchanged", () => {
    expect(normalizeMitsDisplayName("MOHIT SHARMA")).toBe("MOHIT SHARMA");
    expect(normalizeMitsDisplayName("Aarav Mehta")).toBe("Aarav Mehta");
  });

  it("leaves malformed or unknown non-roll prefixes unchanged without guessing", () => {
    expect(normalizeMitsDisplayName("UNKNOWN PREFIX JOHN DOE")).toBe("UNKNOWN PREFIX JOHN DOE");
    expect(normalizeMitsDisplayName("XYZ123 JANE DOE")).toBe("XYZ123 JANE DOE");
  });

  it("handles empty or missing Google names safely", () => {
    expect(normalizeMitsDisplayName("")).toBe("");
    expect(normalizeMitsDisplayName("   ")).toBe("");
    expect(normalizeMitsDisplayName(null)).toBe("");
    expect(normalizeMitsDisplayName(undefined)).toBe("");
  });
});
