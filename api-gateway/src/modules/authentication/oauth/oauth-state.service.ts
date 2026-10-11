import { createHash, randomBytes } from "node:crypto";
import { redis } from "../../../lib/redis";

export type OAuthProvider = "google" | "github";

const STATE_TTL_SECONDS = 600;

const CONSUME_STATE_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if value then
  redis.call("DEL", KEYS[1])
end
return value
`;

function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export async function createOAuthState(
  provider: OAuthProvider,
): Promise<string> {
  const state = randomBytes(32).toString("hex");
  const key = `auth:oauth-state:${hashState(state)}`;

  await redis.set(key, provider, {
    EX: STATE_TTL_SECONDS,
  });

  return state;
}

export async function consumeOAuthState(
  state: unknown,
  provider: OAuthProvider,
): Promise<boolean> {
  if (typeof state !== "string" || !/^[a-f0-9]{64}$/.test(state)) {
    return false;
  }

  const key = `auth:oauth-state:${hashState(state)}`;

  const result: unknown = await redis.eval(CONSUME_STATE_SCRIPT, {
    keys: [key],
    arguments: [],
  });

  return result === provider;
}
