import { z } from "zod";

export const transferOwnershipSchema = z.object({
  targetEmail: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(1, "Target email is required.")
        .email("Valid email format required."),
    ),
});

export const createAdminSkillSchema = z.object({
  name: z
    .string()
    .min(2, "Skill name must be at least 2 characters.")
    .max(50, "Skill name must be at most 50 characters.")
    .trim(),
  category: z
    .string()
    .min(2, "Category must be at least 2 characters.")
    .max(50, "Category must be at most 50 characters.")
    .trim()
    .optional()
    .default("General"),
});

export const updateAdminSkillSchema = z.object({
  name: z
    .string()
    .min(2, "Skill name must be at least 2 characters.")
    .max(50, "Skill name must be at most 50 characters.")
    .trim()
    .optional(),
  category: z
    .string()
    .min(2, "Category must be at least 2 characters.")
    .max(50, "Category must be at most 50 characters.")
    .trim()
    .optional(),
});

export const updatePlatformSettingsSchema = z.object({
  platformName: z
    .string()
    .min(1, "Platform name is required.")
    .max(50, "Platform name too long.")
    .trim()
    .optional(),
  collegeDisplayName: z
    .string()
    .min(1, "College display name is required.")
    .max(100, "College display name too long.")
    .trim()
    .optional(),
  supportEmail: z
    .string()
    .email("Invalid support email address.")
    .trim()
    .toLowerCase()
    .optional(),
  allowCustomSkills: z.boolean().optional(),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type CreateAdminSkillInput = z.infer<typeof createAdminSkillSchema>;
export type UpdateAdminSkillInput = z.infer<typeof updateAdminSkillSchema>;
export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>;
