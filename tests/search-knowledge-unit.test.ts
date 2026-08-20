import { describe, expect, it } from "vitest";

import { knowledgeSearchSchema } from "@/lib/validations/search";

describe("Knowledge Search Validation Schema (knowledgeSearchSchema)", () => {
  it("validates valid search query input", () => {
    const valid = {
      q: " React useEffect ",
      status: "RESOLVED",
      urgency: "ASSIGNMENT_STUCK",
      page: "2",
      limit: "15",
    };

    const parsed = knowledgeSearchSchema.parse(valid);
    expect(parsed.q).toBe("React useEffect");
    expect(parsed.status).toBe("RESOLVED");
    expect(parsed.urgency).toBe("ASSIGNMENT_STUCK");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(15);
  });

  it("defaults status to ALL, page to 1, and limit to 10", () => {
    const parsed = knowledgeSearchSchema.parse({});
    expect(parsed.status).toBe("ALL");
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });

  it("rejects invalid status enum", () => {
    const invalid = { status: "INVALID_STATUS" };
    const result = knowledgeSearchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid urgency enum", () => {
    const invalid = { urgency: "SUPER_URGENT" };
    const result = knowledgeSearchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("caps limit to maximum of 50", () => {
    const input = { limit: "100" };
    const result = knowledgeSearchSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative or zero page numbers", () => {
    const input = { page: "0" };
    const result = knowledgeSearchSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
