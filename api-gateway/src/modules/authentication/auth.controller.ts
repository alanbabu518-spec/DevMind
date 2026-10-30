import type { Request, Response } from "express";
import { requestMagicLinkSchema } from "./auth.validation";
import {
  requestMagicLink as requestMagicLinkService,
  verifyMagicLink as verifyMagicLinkService,
} from "./auth.service";
import {
  createSession,
  deleteSession,
  deleteAllSessionsForUser,
} from "./session.service";
import { prisma } from "../../lib/prisma";

const SESSION_COOKIE_NAME = "devmind_session";
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const ALLOWED_PLANS = ["Free", "Pro", "Team"] as const;

export async function requestMagicLink(
  req: Request,
  res: Response,
): Promise<void> {
  const result = requestMagicLinkSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      status: "error",
      message: result.error.issues[0]?.message ?? "Invalid email address.",
    });
    return;
  }

  try {
    await requestMagicLinkService(result.data);

    res.status(200).json({
      status: "success",
      message:
        "If the request can be processed, you will receive an email with a sign-in link.",
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to process the sign-in request.",
    });
  }
}

export async function verifyMagicLink(
  req: Request,
  res: Response,
): Promise<void> {
  const token =
    typeof req.query.token === "string" ? req.query.token.trim() : "";

  if (!token || token.length > 256) {
    res.status(400).json({
      status: "error",
      message: "A valid sign-in token is required.",
    });
    return;
  }

  try {
    const result = await verifyMagicLinkService(token);

    if (!result) {
      res.status(401).json({
        status: "error",
        message: "The sign-in link is invalid, expired, or already used.",
      });
      return;
    }

    const session = await createSession(result.user.id);

    res.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });

    // Read the persisted onboarding status from PostgreSQL.
    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { onboardingCompleted: true },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";

    const destination = user?.onboardingCompleted ? "/Home" : "/onboarding";

    const redirectUrl = new URL(destination, frontendUrl);
    redirectUrl.searchParams.set("auth", "success");

    res.redirect(redirectUrl.toString());
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to verify the sign-in link.",
    });
  }
}

export async function getCurrentUser(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarId: true,
        profileCompleted: true,
        emailVerified: true,
        createdAt: true,
        onboardingCompleted: true,
        selectedPlan: true,
      },
    });

    if (!user) {
      res.status(401).json({
        status: "error",
        message: "User account not found.",
      });
      return;
    }

    // The database column is `avatarId`; the frontend expects `avatar`.
    const { avatarId, ...rest } = user;

    res.status(200).json({
      status: "success",
      data: { user: { ...rest, avatar: avatarId } },
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to retrieve the current user.",
    });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];

  try {
    if (typeof sessionToken === "string") {
      await deleteSession(sessionToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      status: "success",
      message: "Logged out successfully.",
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to log out. Please try again.",
    });
  }
}

export async function completeOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
    return;
  }

  const selectedPlan: unknown = req.body?.selectedPlan;

  if (
    typeof selectedPlan !== "string" ||
    !ALLOWED_PLANS.some((plan) => plan === selectedPlan)
  ) {
    res.status(400).json({
      status: "error",
      message: "Please select a valid plan.",
    });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        selectedPlan,
        onboardingCompleted: true,
      },
      select: {
        id: true,
        onboardingCompleted: true,
        selectedPlan: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to save onboarding progress.",
    });
  }
}
