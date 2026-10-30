import { createHash, randomBytes } from "node:crypto";
import { redis } from "../../lib/redis";

const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const sessionId = `auth:session:${tokenHash}`;

  await redis.set(sessionId, userId, {
    EX: SESSION_EXPIRY_SECONDS,
    NX: true,
  });

  return {
    token,
    expiresAt: new Date(Date.now() + SESSION_EXPIRY_SECONDS * 1000),
  };
}

export async function getSessionUserId(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  return redis.get(`auth:session:${tokenHash}`);
}

export async function deleteSession(token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return;
  }

  const tokenHash = hashSessionToken(token);

  await redis.del(`auth:session:${tokenHash}`);
}

/** Revoke every active session belonging to a user, including other browsers. */
export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  for await (const keys of redis.scanIterator({
    MATCH: "auth:session:*",
    COUNT: 100,
  })) {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const sessionUserId = await redis.get(key);

      if (sessionUserId === userId) {
        await redis.del(key);
      }
    }
  }
}
