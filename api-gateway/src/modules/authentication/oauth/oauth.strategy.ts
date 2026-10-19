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

export async function getGoogleVerifiedEmail(
  profile: GoogleProfile,
): Promise<string | null> {
  const email = profile._json.email;

  if (
    profile._json.email_verified !== true ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return null;
  }

  return email.trim().toLowerCase();
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

  const githubConnectClientId =
    process.env.GITHUB_CONNECT_CLIENT_ID;
  const githubConnectClientSecret =
    process.env.GITHUB_CONNECT_CLIENT_SECRET;

  if (
    !callbackBaseUrl ||
    !googleClientId ||
    !googleClientSecret ||
    !githubClientId ||
    !githubClientSecret
  ) {
    throw new Error(
      "Google and GitHub sign-in OAuth environment variables are not configured",
    );
  }

  if (
    !githubConnectClientId ||
    !githubConnectClientSecret
  ) {
    throw new Error(
      "GitHub connection OAuth environment variables are not configured",
    );
  }

  // Existing Google sign-in strategy.
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

  // Existing GitHub sign-in strategy.
  // Keep its callback and permissions separate from repository access.
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

  // Separate GitHub strategy for connecting repositories
  // to an already authenticated DevMind account.
  passport.use(
    "github-connect",
    new GitHubStrategy(
      {
        clientID: githubConnectClientId,
        clientSecret: githubConnectClientSecret,
        callbackURL: `${callbackBaseUrl}/api/github/connect/callback`,
        scope: ["repo", "user:email"],
      },
      async (
        accessToken: string,
        _refreshToken: string,
        profile: GitHubProfile,
        done: VerifyCallback,
      ) => {
        try {
          if (!profile.id || !accessToken) {
            return done(null, false, {
              message: "GitHub did not provide the required account details",
            });
          }

          // Do not create a DevMind user here.
          // The protected callback will validate the signed-in user,
          // verify OAuth state, check account ownership, and encrypt
          // the token before persisting it.
          return done(null, {
            providerAccountId: profile.id,
            username: profile.username ?? null,
            accessToken,
          });
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );
}

export default passport;