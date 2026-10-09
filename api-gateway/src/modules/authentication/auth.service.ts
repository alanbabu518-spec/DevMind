import { prisma } from "../../lib/prisma";
import type { RequestMagicLinkInput } from "./auth.validation";
import {
  createMagicLinkToken,
  consumeMagicLinkToken,
} from "./magic-link.service";

export async function requestMagicLink(
  input: RequestMagicLinkInput,
): Promise<void> {
  const { token, expiresAt } = await createMagicLinkToken(input.email);

  const magicLink = `http://localhost:5173/verify-email?token=${token}`;

  if (process.env.NODE_ENV !== "production") {
    console.log("Development magic link:", magicLink);
    console.log("Magic link expires at:", expiresAt.toISOString());
  }
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
}
