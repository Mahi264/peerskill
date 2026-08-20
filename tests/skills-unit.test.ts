import { describe, expect, it } from "vitest";

import { generateSkillSlug } from "@/lib/skills";

describe("Skill Slug Generation & Normalization (lib/skills.ts)", () => {
  it("normalizes programming symbols without colliding with base skills", () => {
    expect(generateSkillSlug("C++")).toBe("c-plus-plus");
    expect(generateSkillSlug("C")).toBe("c");
    expect(generateSkillSlug("C#")).toBe("c-sharp");
    expect(generateSkillSlug(".NET")).toBe("dot-net");
    expect(generateSkillSlug("Node.js")).toBe("node-js");
  });

  it("handles whitespace, casing, and standard alphanumeric names", () => {
    expect(generateSkillSlug("  Python  ")).toBe("python");
    expect(generateSkillSlug("React Native")).toBe("react-native");
    expect(generateSkillSlug("HTML5")).toBe("html5");
  });
});
