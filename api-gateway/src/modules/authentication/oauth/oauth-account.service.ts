import { prisma } from "../../../lib/prisma";

export type OAuthProvider = "google" | "github";

interface OAuthAccountInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string | null;
}

export async function findOrCreateOAuthUser(
  input: OAuthAccountInput,
): Promise<{ id: string }> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.providerAccountId) {
    throw new Error("OAuth provider did not return required account details");
  }

  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: input.provider,
        providerAccountId: input.providerAccountId,
      },
    },
    select: {
      user: {
        select: { id: true },
      },
    },
  });

  if (existingAccount) {
    return existingAccount.user;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      emailVerified: true,
    },
  });

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      },
      select: {
        user: {
          select: { id: true },
        },
      },
    });

    if (account) {
      return account.user;
    }

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerified: existingUser.emailVerified ?? new Date(),
            name: existingUser.name ?? input.name,
          },
          select: { id: true },
        })
      : await tx.user.create({
          data: {
            email,
            name: input.name,
            emailVerified: new Date(),
          },
          select: { id: true },
        });

    await tx.account.create({
      data: {
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        userId: user.id,
      },
    });

    return user;
  });
}
