import type { NextFunction, Request, Response } from "express";
import { getSessionUserId } from "../modules/authentication/session.service";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const SESSION_COOKIE_NAME = "devmind_session";

export async function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];

  if (typeof sessionToken !== "string") {
    res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
    return;
  }

  try {
    const userId = await getSessionUserId(sessionToken);

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "Session is invalid or expired. Please sign in again.",
      });
      return;
    }

    req.userId = userId;
    next();
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to verify the authentication session.",
    });
  }
}
