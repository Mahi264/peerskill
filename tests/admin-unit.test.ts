import { describe, expect, it } from "vitest";

import {
  createAdminSkillSchema,
  transferOwnershipSchema,
  updateAdminSkillSchema,
  updatePlatformSettingsSchema,
} from "@/lib/validations/admin";

describe("Admin Validations & Schemas (Unit)", () => {
  it("validates transferOwnershipSchema with trimming and email formatting", () => {
    const valid = transferOwnershipSchema.safeParse({
      targetEmail: "  NEW-ADMIN@gmail.COM  ",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.targetEmail).toBe("new-admin@gmail.com");
    }

    const invalid = transferOwnershipSchema.safeParse({
      targetEmail: "not-an-email",
    });
    expect(invalid.success).toBe(false);

    const empty = transferOwnershipSchema.safeParse({
      targetEmail: "   ",
    });
    expect(empty.success).toBe(false);
  });

  it("validates createAdminSkillSchema with bounds and default category", () => {
    const validWithCat = createAdminSkillSchema.safeParse({
      name: "Distributed Systems",
      category: "Computer Science",
    });
    expect(validWithCat.success).toBe(true);
    if (validWithCat.success) {
      expect(validWithCat.data.name).toBe("Distributed Systems");
      expect(validWithCat.data.category).toBe("Computer Science");
    }

    const validDefaultCat = createAdminSkillSchema.safeParse({
      name: "Cybersecurity",
    });
    expect(validDefaultCat.success).toBe(true);
    if (validDefaultCat.success) {
      expect(validDefaultCat.data.category).toBe("General");
    }

    const tooShort = createAdminSkillSchema.safeParse({
      name: "A",
    });
    expect(tooShort.success).toBe(false);
  });

  it("validates updateAdminSkillSchema", () => {
    const valid = updateAdminSkillSchema.safeParse({
      name: "Advanced Computer Networks",
      category: "Networking",
    });
    expect(valid.success).toBe(true);

    expect(updateAdminSkillSchema.safeParse({}).success).toBe(true);
  });

  it("validates updatePlatformSettingsSchema with safe bounds", () => {
    const valid = updatePlatformSettingsSchema.safeParse({
      platformName: "PeerSkill MITS",
      collegeDisplayName: "Madhav Institute of Technology & Science",
      supportEmail: "support@mitsgwl.ac.in",
      allowCustomSkills: false,
    });
    expect(valid.success).toBe(true);

    const invalidEmail = updatePlatformSettingsSchema.safeParse({
      supportEmail: "invalid-email",
    });
    expect(invalidEmail.success).toBe(false);
  });
});
