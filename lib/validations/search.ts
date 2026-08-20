import { z } from "zod";

export const knowledgeSearchSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["ALL", "OPEN", "RESOLVED"]).optional().default("ALL"),
  urgency: z
    .enum(["CURIOUS", "ASSIGNMENT_STUCK", "PROJECT_BLOCKED", "EXAM_PREP"])
    .optional(),
  skillId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;

export const peerSearchSchema = z.object({
  q: z.string().trim().optional(),
  skill: z.string().trim().optional(),
  skillId: z.string().trim().optional(),
  department: z.string().trim().optional(),
  available: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  level: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "MENTOR"])
    .optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type PeerSearchInput = z.infer<typeof peerSearchSchema>;
