import { describe, expect, it } from "vitest";

import { isCollegeEmail } from "@/lib/college-email";

const collegeEmailDomain = "mitsgwl.ac.in";

describe("isCollegeEmail", () => {
  it("accepts an email from the configured college domain", () => {
    expect(
      isCollegeEmail("24cs10mo80@mitsgwl.ac.in", collegeEmailDomain),
    ).toBe(true);
  });

  it("accepts the configured domain case-insensitively", () => {
    expect(
      isCollegeEmail("Student@MITSgwl.ac.in", collegeEmailDomain),
    ).toBe(true);
  });

  it("rejects an email from another domain", () => {
    expect(
      isCollegeEmail("student@gmail.com", collegeEmailDomain),
    ).toBe(false);
  });

  it("rejects a different institutional domain", () => {
    expect(
      isCollegeEmail("student@othercollege.edu", collegeEmailDomain),
    ).toBe(false);
  });

  it("rejects an email that only contains the domain as text", () => {
    expect(
      isCollegeEmail(
        "student-mitsgwl.ac.in@example.com",
        collegeEmailDomain,
      ),
    ).toBe(false);
  });
});
