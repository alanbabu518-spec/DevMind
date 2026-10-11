import { prisma } from "../../../lib/prisma";

export type OAuthProvider = "google" | "github";

interface OAuthAccountInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string | null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function findExistingAccount(
  provider: OAuthProvider,
  providerAccountId: string,
): Promise<{ id: string } | null> {
  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    select: {
      user: {
        select: { id: true },
      },
    },
  });

  return account?.user ?? null;
}

export async function findOrCreateOAuthUser(
  input: OAuthAccountInput,
): Promise<{ id: string }> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.providerAccountId) {
    throw new Error("OAuth provider did not return required account details");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const existingAccount = await findExistingAccount(
      input.provider,
      input.providerAccountId,
    );

    if (existingAccount) {
      return existingAccount;
    }

    try {
      return await prisma.$transaction(async (tx) => {
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

        const existingUser = await tx.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            emailVerified: true,
          },
        });

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
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("Unable to complete OAuth account linking");
}
