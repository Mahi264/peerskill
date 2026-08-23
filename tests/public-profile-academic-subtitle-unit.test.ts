import { describe, it, expect } from "vitest";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

describe("formatPublicPeerAcademicSubtitle", () => {
  it("formats branch and section when section exists", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      department: "Computer Science",
      branch: "Computer Science & Engineering (CSE)",
      section: "A",
      graduationYear: null,
    });
    expect(subtitle).toBe("Computer Science & Engineering (CSE) • Section A");
  });

  it("formats branch only when section is not set", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      department: "Computer Science",
      branch: "Computer Science & Engineering (CSE)",
      section: null,
      graduationYear: null,
    });
    expect(subtitle).toBe("Computer Science & Engineering (CSE)");
  });

  it("appends graduation year when present", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      department: "Computer Science",
      branch: "Computer Science & Engineering (CSE)",
      section: "A",
      graduationYear: 2028,
    });
    expect(subtitle).toBe("Computer Science & Engineering (CSE) • Section A • Class of 2028");
  });

  it("falls back to department if branch is not available", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      department: "Mechanical Engineering",
      branch: null,
      section: "B",
      graduationYear: 2026,
    });
    expect(subtitle).toBe("Mechanical Engineering • Section B • Class of 2026");
  });

  it("does not prepend department when branch is present", () => {
    const subtitle = formatPublicPeerAcademicSubtitle({
      department: "Information Technology",
      branch: "Artificial Intelligence & Data Science (AIDS)",
      section: "C",
      graduationYear: null,
    });
    expect(subtitle).not.toContain("Information Technology");
    expect(subtitle).toBe("Artificial Intelligence & Data Science (AIDS) • Section C");
  });
});
