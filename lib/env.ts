import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().optional().default("file:./dev.db"),
  COLLEGE_EMAIL_DOMAIN: z
    .string()
    .optional()
    .default("mitsgwl.ac.in")
    .transform((value) => value.toLowerCase().trim()),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_REDIRECT_URI: z
    .string()
    .optional()
    .default("http://localhost:3000/api/auth/callback/google"),
  PEERSKILL_INITIAL_ADMIN_EMAIL: z.string().optional().default(""),
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  COLLEGE_EMAIL_DOMAIN: process.env.COLLEGE_EMAIL_DOMAIN || "mitsgwl.ac.in",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  PEERSKILL_INITIAL_ADMIN_EMAIL: process.env.PEERSKILL_INITIAL_ADMIN_EMAIL,
});
