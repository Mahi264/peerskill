import { describe, expect, it } from "vitest";

import { getFoundationAreas } from "@/lib/foundation";

describe("getFoundationAreas", () => {
  it("returns the Phase 0 foundation sections", () => {
    const areas = getFoundationAreas();

    expect(areas).toHaveLength(4);
    expect(areas.every((area) => area.items.length > 0)).toBe(true);
    expect(areas.map((area) => area.title)).toContain("Data foundation");
  });
});
