import { createHash, randomBytes } from "node:crypto";
import { redis } from "../../lib/redis";

const MAGIC_LINK_EXPIRY_SECONDS = 15 * 60;

export function hashMagicLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMagicLinkToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashMagicLinkToken(token);

  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_SECONDS * 1000);

  await redis.set(`auth:magic-link:${tokenHash}`, normalizedEmail, {
    EX: MAGIC_LINK_EXPIRY_SECONDS,
    NX: true,
  });

  return {
    token,
    expiresAt,
  };
}

export async function consumeMagicLinkToken(
  token: string,
): Promise<string | null> {
  const tokenHash = hashMagicLinkToken(token);
  const key = `auth:magic-link:${tokenHash}`;

  const email = await redis.eval(
    "local email = redis.call('GET', KEYS[1]); if email then redis.call('DEL', KEYS[1]); end; return email",
    {
      keys: [key],
      arguments: [],
    },
  );

  return typeof email === "string" ? email : null;
}
