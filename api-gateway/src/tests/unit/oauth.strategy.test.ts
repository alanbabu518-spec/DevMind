import { describe, expect, it, vi } from "vitest";
import type { Profile as GoogleProfile } from "passport-google-oauth20";

vi.mock("../../modules/authentication/oauth/oauth-account.service", () => ({
  findOrCreateOAuthUser: vi.fn(),
}));

import { getGoogleVerifiedEmail } from "../../modules/authentication/oauth/oauth.strategy";

function createGoogleProfile(
  email: unknown,
  emailVerified: unknown,
): GoogleProfile {
  return {
    id: "google-user-123",
    displayName: "Test Developer",
    emails:
      typeof email === "string"
        ? [{ value: email, type: "account" }]
        : undefined,
    _json: {
      email,
      email_verified: emailVerified,
    },
  } as GoogleProfile;
}

describe("getGoogleVerifiedEmail", () => {
  it("returns the normalized email when Google verifies it", async () => {
    const profile = createGoogleProfile(" Developer@Example.com ", true);

    await expect(getGoogleVerifiedEmail(profile)).resolves.toBe(
      "developer@example.com",
    );
  });

  it("rejects an email that Google has not verified", async () => {
    const profile = createGoogleProfile("developer@example.com", false);

    await expect(getGoogleVerifiedEmail(profile)).resolves.toBeNull();
  });

  it("rejects a missing email", async () => {
    const profile = createGoogleProfile(undefined, true);

    await expect(getGoogleVerifiedEmail(profile)).resolves.toBeNull();
  });

  it("rejects an empty email", async () => {
    const profile = createGoogleProfile("   ", true);

    await expect(getGoogleVerifiedEmail(profile)).resolves.toBeNull();
  });

  it("rejects a non-string email", async () => {
    const profile = createGoogleProfile(123, true);

    await expect(getGoogleVerifiedEmail(profile)).resolves.toBeNull();
  });

  it("rejects a missing verification flag", async () => {
    const profile = createGoogleProfile("developer@example.com", undefined);

    await expect(getGoogleVerifiedEmail(profile)).resolves.toBeNull();
  });
});
