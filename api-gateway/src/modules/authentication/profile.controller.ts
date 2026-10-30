import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { deleteSession } from "./session.service";
import {
  deleteAccountSchema,
  updateProfileSchema,
  usernameQuerySchema,
  usernameSchema,
} from "./auth.validation";

const SESSION_COOKIE_NAME = "devmind_session";

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  avatarId: true,
  profileCompleted: true,
  onboardingCompleted: true,
  selectedPlan: true,
  emailVerified: true,
  createdAt: true,
} as const;

// The database column is `avatarId`; the API and frontend call it `avatar`.
function toDto<T extends { avatarId: string }>(user: T) {
  const { avatarId, ...rest } = user;
  return { ...rest, avatar: avatarId };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function requireUserId(req: Request, res: Response): string | null {
  if (!req.userId) {
    res
      .status(401)
      .json({ status: "error", message: "Authentication required." });
    return null;
  }
  return req.userId;
}

/** GET /api/auth/username-available?username=ada */
export async function checkUsername(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const query = usernameQuerySchema.safeParse(req.query);
  const parsed = usernameSchema.safeParse(
    query.success ? query.data.username : "",
  );

  if (!parsed.success) {
    res.status(200).json({
      status: "success",
      data: {
        available: false,
        reason: parsed.error.issues[0]?.message ?? "Invalid username.",
      },
    });
    return;
  }

  try {
    const owner = await prisma.user.findUnique({
      where: { username: parsed.data },
      select: { id: true },
    });
    const available = !owner || owner.id === userId;

    res.status(200).json({
      status: "success",
      data: {
        available,
        reason: available ? undefined : "That username is already taken.",
      },
    });
  } catch {
    res
      .status(500)
      .json({ status: "error", message: "Unable to check that username." });
  }
}

/** PATCH /api/auth/profile  { username?, avatar?, name? } */
export async function updateProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      status: "error",
      message: result.error.issues[0]?.message ?? "Invalid profile data.",
    });
    return;
  }

  try {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!current) {
      res
        .status(401)
        .json({ status: "error", message: "User account not found." });
      return;
    }

    const username = result.data.username ?? current.username;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(result.data.username !== undefined && {
          username: result.data.username,
        }),
        ...(result.data.avatar !== undefined && {
          avatarId: result.data.avatar,
        }),
        ...(result.data.name !== undefined && {
          name: result.data.name === "" ? null : result.data.name,
        }),
        // avatarId always has a default, so the profile is complete
        // as soon as a username exists.
        profileCompleted: Boolean(username),
      },
      select: PROFILE_SELECT,
    });

    res.status(200).json({ status: "success", data: { user: toDto(user) } });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res
        .status(409)
        .json({ status: "error", message: "That username is already taken." });
      return;
    }
    res
      .status(500)
      .json({ status: "error", message: "Unable to update your profile." });
  }
}

/** DELETE /api/auth/account  { confirmation } — permanent. */
export async function deleteAccount(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const result = deleteAccountSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      status: "error",
      message:
        result.error.issues[0]?.message ?? "Please confirm the deletion.",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      res
        .status(401)
        .json({ status: "error", message: "User account not found." });
      return;
    }

    const typed = result.data.confirmation.toLowerCase();
    const accepted = [user.username, user.email]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    if (!accepted.includes(typed)) {
      res.status(400).json({
        status: "error",
        message: "The confirmation text does not match.",
      });
      return;
    }

    // Accounts (incl. encrypted GitHub token), projects and conversations
    // are removed by the cascading foreign keys.
    await prisma.$transaction([
      prisma.magicLinkToken.deleteMany({ where: { email: user.email } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof sessionToken === "string") {
      await deleteSession(sessionToken).catch(() => undefined);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      status: "success",
      message: "Your account has been permanently deleted.",
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to delete your account. Please try again.",
    });
  }
}
