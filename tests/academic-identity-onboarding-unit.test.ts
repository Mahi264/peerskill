import { describe, expect, it } from "vitest";
import { parseMitsEmail, getExpectedGraduationYear } from "@/lib/mits-email";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";
import { updateProfileSchema } from "@/lib/validations/profile";
import { peerSearchSchema } from "@/lib/validations/search";

describe("Academic Identity & Department Removal (Unit & Architecture)", () => {
  describe("1. Batch vs Expected Graduation Year Calculation", () => {
    it("parses 24cs10mo80@mitsgwl.ac.in to batch 2024 and expected graduation 2028 (Class of 2028)", () => {
      const parsed = parseMitsEmail("24cs10mo80@mitsgwl.ac.in");
      expect(parsed.isValidDomain).toBe(true);
      expect(parsed.batchYear).toBe(2024);
      expect(parsed.expectedGraduationYear).toBe(2028);
      expect(parsed.branchCode).toBe("cs");
      expect(parsed.branchName).toBe("Computer Science & Engineering (CSE)");
    });

    it("verifies graduationYear calculation formula is strictly batch + 4 for regular 4-year B.Tech", () => {
      expect(getExpectedGraduationYear(2024)).toBe(2028);
      expect(getExpectedGraduationYear(2025)).toBe(2029);
      expect(getExpectedGraduationYear(2026)).toBe(2030);
      expect(getExpectedGraduationYear(null)).toBeNull();
    });

    it("ensures public subtitle displays Class of 2028 and not Class of 2024 for batch 2024", () => {
      const parsed = parseMitsEmail("24cs10mo80@mitsgwl.ac.in");
      const subtitle = formatPublicPeerAcademicSubtitle({
        branch: parsed.branchName,
        section: "A",
        graduationYear: parsed.expectedGraduationYear,
      });

      expect(subtitle).toBe("Computer Science & Engineering (CSE) • Section A • Class of 2028");
      expect(subtitle).not.toContain("Class of 2024");
    });
  });

  describe("2. Branch / Program Read-Only & Unresolved Handling", () => {
    it("handles unrecognized branch codes safely without guessing", () => {
      const parsed = parseMitsEmail("24zz10mo80@mitsgwl.ac.in");
      expect(parsed.isValidDomain).toBe(true);
      expect(parsed.batchYear).toBe(2024);
      expect(parsed.expectedGraduationYear).toBe(2028);
      expect(parsed.branchCode).toBe("zz");
      expect(parsed.branchName).toBeNull();
    });

    it("formats subtitle safely as 'Campus Student' when branch is null", () => {
      const subtitle = formatPublicPeerAcademicSubtitle({
        branch: null,
        section: null,
        graduationYear: 2028,
      });
      expect(subtitle).toBe("Campus Student • Class of 2028");
    });
  });

  describe("3. Complete Department Elimination from Validations & Schemas", () => {
    it("validates profile update schema without requiring or checking department", () => {
      const validProfile = {
        fullName: "Aarav Sharma",
        branch: "Computer Science & Engineering (CSE)",
        graduationYear: 2028,
        section: "A",
        bio: "Fullstack developer",
      };

      const result = updateProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("department");
        expect(result.data.branch).toBe("Computer Science & Engineering (CSE)");
        expect(result.data.graduationYear).toBe(2028);
      }
    });

    it("validates peer search schema without department filter parameter", () => {
      const validSearch = {
        q: "Mohit",
        available: "true",
        level: "ADVANCED",
        skill: "React",
        page: "1",
        limit: "10",
      };

      const result = peerSearchSchema.safeParse(validSearch);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("department");
      }
    });
  });
});
