import { prisma } from "../../lib/prisma";
import type { RequestMagicLinkInput } from "./auth.validation";
import {
  createMagicLinkToken,
  consumeMagicLinkToken,
} from "./magic-link.service";
import { sendMagicLinkEmail } from "../../lib/email";

export async function requestMagicLink(
  input: RequestMagicLinkInput,
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not configured");
  }

  const { token } = await createMagicLinkToken(input.email);

  const magicLink = `${frontendUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;

  await sendMagicLinkEmail(input.email, magicLink);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function verifyMagicLink(token: string) {
  const email = await consumeMagicLinkToken(token);

  if (!email) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const user = existingUser.emailVerified
      ? existingUser
      : await prisma.user.update({
          where: { id: existingUser.id },
          data: { emailVerified: new Date() },
        });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      isNewUser: false,
    };
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      isNewUser: true,
    };
  } catch (error: unknown) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw error;
    }

    const verifiedUser = user.emailVerified
      ? user
      : await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });

    return {
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        name: verifiedUser.name,
      },
      isNewUser: false,
    };
  }
}
