import { z } from "zod";

const PASSWORD_MIN_LENGTH = 8;

export const registerSchema = z.object({
  email: z.string().email("A valid email address is required."),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
