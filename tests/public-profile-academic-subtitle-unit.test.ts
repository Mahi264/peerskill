import { describe, it, expect } from "vitest";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

describe("formatPublicPeerAcademicSubtitle", () => {
  it("formats branch and section when section exists", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      branch: "Computer Science & Engineering (CSE)",
      section: "A",
      graduationYear: null,
    });
    expect(subtitle).toBe("Computer Science & Engineering (CSE) • Section A");
  });

  it("formats branch only when section is not set", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      branch: "Computer Science & Engineering (CSE)",
      section: null,
      graduationYear: null,
    });
    expect(subtitle).toBe("Computer Science & Engineering (CSE)");
  });

  it("appends graduation year when present", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      branch: "Computer Science & Engineering (CSE)",
      section: "A",
      graduationYear: 2028,
    });
    expect(subtitle).toBe("Computer Science & Engineering (CSE) • Section A • Class of 2028");
  });

  it("falls back to Campus Student if branch is not available", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      branch: null,
      section: "B",
      graduationYear: 2028,
    });
    expect(subtitle).toBe("Campus Student • Section B • Class of 2028");
  });

  it("formats branch and class without department concept", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      branch: "Artificial Intelligence & Data Science (AI-DS)",
      section: "C",
      graduationYear: 2028,
    });
    expect(subtitle).toBe("Artificial Intelligence & Data Science (AI-DS) • Section C • Class of 2028");
  });
});
