import { timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import passport from "passport";
import { createSession } from "../session.service";
import {
  consumeOAuthState,
  createOAuthState,
  type OAuthProvider,
} from "./oauth-state.service";

const router = Router();

const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const STATE_EXPIRY_MS = 10 * 60 * 1000;

function getStateCookieName(provider: OAuthProvider): string {
  return `devmind_oauth_state_${provider}`;
}

function getStateCookieOptions(provider: OAuthProvider) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: `/api/auth/oauth/${provider}/callback`,
    maxAge: STATE_EXPIRY_MS,
  };
}

function frontendRedirect(
  status: "success" | "error",
  provider: OAuthProvider,
): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";

  const url = new URL("/devmind/onboarding", frontendUrl);
  url.searchParams.set("oauth", status);
  url.searchParams.set("provider", provider);

  return url.toString();
}

function validateOAuthState(provider: OAuthProvider): RequestHandler {
  return async (req, res, next) => {
    const cookieName = getStateCookieName(provider);
    const cookieOptions = getStateCookieOptions(provider);
    const cookieState = req.cookies?.[cookieName];
    const queryState = req.query.state;

    try {
      if (
        typeof cookieState !== "string" ||
        typeof queryState !== "string" ||
        !/^[a-f0-9]{64}$/.test(cookieState) ||
        !/^[a-f0-9]{64}$/.test(queryState)
      ) {
        res.clearCookie(cookieName, cookieOptions);
        res.redirect(frontendRedirect("error", provider));
        return;
      }

      const cookieBuffer = Buffer.from(cookieState, "hex");
      const queryBuffer = Buffer.from(queryState, "hex");

      if (
        cookieBuffer.length !== queryBuffer.length ||
        !timingSafeEqual(cookieBuffer, queryBuffer)
      ) {
        res.clearCookie(cookieName, cookieOptions);
        res.redirect(frontendRedirect("error", provider));
        return;
      }

      res.clearCookie(cookieName, cookieOptions);

      const valid = await consumeOAuthState(queryState, provider);

      if (!valid) {
        res.redirect(frontendRedirect("error", provider));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function startOAuth(provider: OAuthProvider): RequestHandler {
  return async (req, res, next) => {
    try {
      const state = await createOAuthState(provider);
      const cookieName = getStateCookieName(provider);

      res.cookie(cookieName, state, getStateCookieOptions(provider));

      const authenticate = passport.authenticate(provider, {
        session: false,
        state,
        scope: provider === "google" ? ["profile", "email"] : ["user:email"],
      });

      authenticate(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

const completeOAuthLogin: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as { id: string } | undefined;

    const provider: OAuthProvider = req.path.includes("google")
      ? "google"
      : "github";

    if (!user?.id) {
      res.redirect(frontendRedirect("error", provider));
      return;
    }

    const session = await createSession(user.id);

    res.cookie("devmind_session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_SECONDS * 1000,
    });

    res.redirect(frontendRedirect("success", provider));
  } catch (error) {
    next(error);
  }
};

router.get("/google", startOAuth("google"));

router.get(
  "/google/callback",
  validateOAuthState("google"),
  passport.authenticate("google", {
    session: false,
    failureRedirect: frontendRedirect("error", "google"),
  }),
  completeOAuthLogin,
);

router.get("/github", startOAuth("github"));

router.get(
  "/github/callback",
  validateOAuthState("github"),
  passport.authenticate("github", {
    session: false,
    failureRedirect: frontendRedirect("error", "github"),
  }),
  completeOAuthLogin,
);

export default router;
