import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  COLLEGE_EMAIL_DOMAIN: z
    .string()
    .min(1, "COLLEGE_EMAIL_DOMAIN is required.")
    .transform((value) => value.toLowerCase().trim()),
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  COLLEGE_EMAIL_DOMAIN: process.env.COLLEGE_EMAIL_DOMAIN,
});
