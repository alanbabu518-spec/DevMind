import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile as GoogleProfile,
} from "passport-google-oauth20";
import {
  Strategy as GitHubStrategy,
  type Profile as GitHubProfile,
} from "passport-github2";
import type { VerifyCallback } from "passport-oauth2";
import { findOrCreateOAuthUser } from "./oauth-account.service";

async function getGoogleVerifiedEmail(
  profile: GoogleProfile,
): Promise<string | null> {
  if (profile._json.email_verified !== true) {
    return null;
  }

  return profile.emails?.[0]?.value ?? null;
}

async function getGitHubVerifiedEmail(
  accessToken: string,
): Promise<string | null> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve verified GitHub email");
  }

  const emails: unknown = await response.json();

  if (!Array.isArray(emails)) {
    throw new Error("Unexpected GitHub email API response");
  }

  const primaryEmail = emails.find(
    (email: unknown) =>
      typeof email === "object" &&
      email !== null &&
      "email" in email &&
      "verified" in email &&
      "primary" in email &&
      typeof email.email === "string" &&
      email.verified === true &&
      email.primary === true,
  );

  return primaryEmail?.email ?? null;
}

export function configureOAuthStrategies(): void {
  const callbackBaseUrl = process.env.OAUTH_CALLBACK_BASE_URL;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (
    !callbackBaseUrl ||
    !googleClientId ||
    !googleClientSecret ||
    !githubClientId ||
    !githubClientSecret
  ) {
    throw new Error("OAuth environment variables are not configured");
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: `${callbackBaseUrl}/api/auth/oauth/google/callback`,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfile,
        done: VerifyCallback,
      ) => {
        try {
          const email = await getGoogleVerifiedEmail(profile);

          if (!email) {
            return done(null, false, {
              message: "Google did not provide a verified email address",
            });
          }

          const user = await findOrCreateOAuthUser({
            provider: "google",
            providerAccountId: profile.id,
            email,
            name: profile.displayName || null,
          });

          return done(null, { id: user.id });
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );

  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: `${callbackBaseUrl}/api/auth/oauth/github/callback`,
        scope: ["user:email"],
      },
      async (
        accessToken: string,
        _refreshToken: string,
        profile: GitHubProfile,
        done: VerifyCallback,
      ) => {
        try {
          const email = await getGitHubVerifiedEmail(accessToken);

          if (!email) {
            return done(null, false, {
              message: "GitHub did not provide a verified primary email",
            });
          }

          const user = await findOrCreateOAuthUser({
            provider: "github",
            providerAccountId: profile.id,
            email,
            name: profile.displayName || profile.username || null,
          });

          return done(null, { id: user.id });
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );
}

export default passport;
