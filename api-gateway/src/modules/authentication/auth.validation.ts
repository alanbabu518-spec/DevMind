import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(254, "Email address is too long.")
    .transform((email) => email.toLowerCase()),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

/* ------------------------------------------------------------------ */
/*  Profile                                                            */
/* ------------------------------------------------------------------ */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "devmind",
  "help",
  "login",
  "logout",
  "me",
  "onboarding",
  "profile",
  "root",
  "settings",
  "support",
  "system",
]);

/** GitHub-style handles: lowercase letters, digits and single hyphens. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters.`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters.`)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use letters, numbers and single hyphens only. No leading or trailing hyphen.",
  )
  .refine((value) => !RESERVED_USERNAMES.has(value), {
    message: "That username is reserved. Please pick another.",
  });

// "identicon:<seed>" — generated in the browser, nothing is uploaded.
export const avatarSchema = z
  .string()
  .trim()
  .regex(
    /^identicon:[a-z0-9]{4,24}$/,
    "Please choose one of the available avatars.",
  );

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    avatar: avatarSchema.optional(),
    name: z
      .string()
      .trim()
      .max(60, "Display name must be at most 60 characters.")
      .optional(),
  })
  .refine(
    (value) =>
      value.username !== undefined ||
      value.avatar !== undefined ||
      value.name !== undefined,
    { message: "Nothing to update." },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const usernameQuerySchema = z.object({ username: z.string() });

export const deleteAccountSchema = z.object({
  confirmation: z.string().trim().min(1, "Please type the confirmation text."),
});
