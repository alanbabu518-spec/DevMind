import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(254, "Email address is too long.")
    .transform((email) => email.toLowerCase()),
});

export type RequestMagicLinkInput = z.infer<
  typeof requestMagicLinkSchema
>;
