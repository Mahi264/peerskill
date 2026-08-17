import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  department: z.string().trim().min(1, "Department is required."),
  branch: z.string().trim().optional(),
  graduationYear: z.number().int().min(2000).max(2100).optional(),
  section: z.string().trim().optional(),
  bio: z.string().trim().max(500, "Bio must be at most 500 characters.").optional(),
  avatarUrl: z.string().trim().url("Invalid avatar URL.").optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const skillItemSchema = z
  .object({
    name: z.string().trim().min(1, "Skill name must not be empty.").optional(),
    skillId: z.string().trim().min(1, "Skill ID must not be empty.").optional(),
    level: z
      .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "MENTOR"])
      .default("BEGINNER"),
  })
  .refine((data) => Boolean(data.name || data.skillId), {
    message: "Either skill name or skillId must be provided.",
  });

export type SkillItemInput = z.infer<typeof skillItemSchema>;

export const updateSkillsSchema = z.object({
  skills: z
    .array(skillItemSchema)
    .min(3, "At least 3 skills are required for onboarding completion."),
});

export type UpdateSkillsInput = z.infer<typeof updateSkillsSchema>;
