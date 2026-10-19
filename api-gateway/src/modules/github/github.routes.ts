import { timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import passport from "passport";
import { requireAuthentication } from "../../middleware/auth.middleware";
import {
  consumeGitHubConnectState,
  createGitHubConnectState,
} from "./github-connect-state.service";
import {
  connectGitHubAccount,
  disconnectGitHubAccount,
  getGitHubConnectionStatus,
  getGitHubRepositoryBranches,
  getGitHubRepositoryContents,
  listGitHubRepositories,
} from "./github.service";

const router = Router();

const STATE_COOKIE = "devmind_github_connect_state";
const STATE_TTL_MS = 10 * 60 * 1000;

function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/github/connect/callback",
    maxAge: STATE_TTL_MS,
  };
}

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:5174";
}

function redirectToFrontend(
  status: "success" | "error",
  message: string,
): string {
  const url = new URL("/Home", getFrontendUrl());
  url.searchParams.set("github", status);
  url.searchParams.set("message", message);
  return url.toString();
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected GitHub integration error occurred";
}

const startConnection: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    const state = await createGitHubConnectState(userId);

    res.cookie(STATE_COOKIE, state, stateCookieOptions());

    passport.authenticate("github-connect", {
      session: false,
      state,
      scope: ["repo", "user:email"],
    })(req, res, next);
  } catch (error) {
    next(error);
  }
};

const validateConnectState: RequestHandler = async (req, res, next) => {
  const cookieState = req.cookies?.[STATE_COOKIE];
  const queryState = req.query.state;
  const userId = req.userId;

  res.clearCookie(STATE_COOKIE, stateCookieOptions());

  if (
    !userId ||
    typeof cookieState !== "string" ||
    typeof queryState !== "string" ||
    !/^[a-f0-9]{64}$/.test(cookieState) ||
    !/^[a-f0-9]{64}$/.test(queryState)
  ) {
    res.redirect(
      redirectToFrontend("error", "invalid_oauth_state"),
    );
    return;
  }

  const cookieBuffer = Buffer.from(cookieState, "hex");
  const queryBuffer = Buffer.from(queryState, "hex");

  if (
    cookieBuffer.length !== queryBuffer.length ||
    !timingSafeEqual(cookieBuffer, queryBuffer)
  ) {
    res.redirect(
      redirectToFrontend("error", "invalid_oauth_state"),
    );
    return;
  }

  try {
    const valid = await consumeGitHubConnectState(
      queryState,
      userId,
    );

    if (!valid) {
      res.redirect(
        redirectToFrontend("error", "expired_oauth_state"),
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

const completeConnection: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.userId;
    const profile = req.user as
      | {
          providerAccountId?: string;
          username?: string | null;
          accessToken?: string;
        }
      | undefined;

    if (
      !userId ||
      !profile?.providerAccountId ||
      !profile.accessToken
    ) {
      res.redirect(
        redirectToFrontend("error", "github_authorization_failed"),
      );
      return;
    }

    await connectGitHubAccount(userId, {
      providerAccountId: profile.providerAccountId,
      username: profile.username ?? null,
      accessToken: profile.accessToken,
    });

    res.redirect(
      redirectToFrontend("success", "github_connected"),
    );
  } catch (error) {
    // Don't leak internal database errors or credentials to the browser.
    if (
      error instanceof Error &&
      error.message.includes("already connected to another DevMind account")
    ) {
      res.redirect(
        redirectToFrontend("error", "github_account_already_linked"),
      );
      return;
    }

    next(error);
  }
};

// All routes require an existing DevMind session.
// OAuth callbacks are top-level GET requests, so SameSite=Lax
// permits the session cookie to be sent by the browser.
router.use(requireAuthentication);

router.get("/status", async (req, res, next) => {
  try {
    const status = await getGitHubConnectionStatus(req.userId!);
    res.json({ status: "success", data: status });
  } catch (error) {
    next(error);
  }
});

router.get("/connect", startConnection);

router.get(
  "/connect/callback",
  validateConnectState,
  passport.authenticate("github-connect", {
    session: false,
    failureRedirect: redirectToFrontend(
      "error",
      "github_authorization_failed",
    ),
  }),
  completeConnection,
);

router.delete("/connect", async (req, res, next) => {
  try {
    await disconnectGitHubAccount(req.userId!);
    res.json({
      status: "success",
      message: "GitHub has been disconnected.",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/repos", async (req, res, next) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.slice(0, 100)
        : "";

    const pageValue = Number(req.query.page ?? 1);
    const page =
      Number.isInteger(pageValue) && pageValue > 0
        ? Math.min(pageValue, 100)
        : 1;

    const repositories = await listGitHubRepositories(
      req.userId!,
      search,
      page,
    );

    res.json({ status: "success", data: repositories });
  } catch (error) {
    next(error);
  }
});

router.get("/repos/:owner/:repo/branches", async (req, res, next) => {
  try {
    const branches = await getGitHubRepositoryBranches(
      req.userId!,
      req.params.owner,
      req.params.repo,
    );

    res.json({ status: "success", data: branches });
  } catch (error) {
    next(error);
  }
});

router.get("/repos/:owner/:repo/contents", async (req, res, next) => {
  try {
    const path =
      typeof req.query.path === "string"
        ? req.query.path
        : "";

    const ref =
      typeof req.query.ref === "string"
        ? req.query.ref.slice(0, 255)
        : undefined;

    const contents = await getGitHubRepositoryContents(
      req.userId!,
      req.params.owner,
      req.params.repo,
      path,
      ref,
    );

    res.json({ status: "success", data: contents });
  } catch (error) {
    next(error);
  }
});

export default router;