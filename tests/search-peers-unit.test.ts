import { describe, expect, it } from "vitest";

import { peerSearchSchema } from "@/lib/validations/search";

describe("Peer Search Validation Schema (peerSearchSchema)", () => {
  it("validates valid peer search query input", () => {
    const valid = {
      q: "Mohit",
      available: "true",
      level: "ADVANCED",
      page: "2",
      limit: "15",
    };

    const parsed = peerSearchSchema.parse(valid);
    expect(parsed.q).toBe("Mohit");
    expect(parsed.available).toBe(true);
    expect(parsed.level).toBe("ADVANCED");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(15);
  });

  it("handles available='false'", () => {
    const parsed = peerSearchSchema.parse({ available: "false" });
    expect(parsed.available).toBe(false);
  });

  it("defaults page to 1 and limit to 10", () => {
    const parsed = peerSearchSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });

  it("rejects invalid level enum", () => {
    const invalid = { level: "GURU" };
    const result = peerSearchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("caps limit to maximum of 50", () => {
    const input = { limit: "100" };
    const result = peerSearchSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects zero or negative page numbers", () => {
    const input = { page: "0" };
    const result = peerSearchSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
