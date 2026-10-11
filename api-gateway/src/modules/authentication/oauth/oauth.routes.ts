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

function frontendRedirect(
  status: "success" | "error",
  provider: OAuthProvider,
): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const url = new URL("/", frontendUrl);
  url.searchParams.set("oauth", status);
  url.searchParams.set("provider", provider);

  return url.toString();
}

function validateOAuthState(provider: OAuthProvider): RequestHandler {
  return async (req, res, next) => {
    try {
      const valid = await consumeOAuthState(req.query.state, provider);

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
      const strategy = provider === "google" ? "google" : "github";

      const authenticate = passport.authenticate(strategy, {
        session: false,
        state,
        ...(provider === "google"
          ? { scope: ["profile", "email"] }
          : { scope: ["user:email"] }),
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

    if (!user?.id) {
      res.redirect(
        frontendRedirect(
          "error",
          req.path.includes("google") ? "google" : "github",
        ),
      );
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

    const provider: OAuthProvider = req.path.includes("google")
      ? "google"
      : "github";

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
