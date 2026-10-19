import { createHash, randomBytes } from "node:crypto";
import { redis } from "../../lib/redis";

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

function stateKey(state: string): string {
  return `auth:github-connect-state:${hashState(state)}`;
}

export async function createGitHubConnectState(
  userId: string,
): Promise<string> {
  if (!userId.trim()) {
    throw new Error("A signed-in user is required");
  }

  const state = randomBytes(32).toString("hex");

  await redis.set(
    stateKey(state),
    userId,
    {
      EX: STATE_TTL_SECONDS,
      NX: true,
    },
  );

  return state;
}

export async function consumeGitHubConnectState(
  state: unknown,
  userId: string,
): Promise<boolean> {
  if (
    typeof state !== "string" ||
    !/^[a-f0-9]{64}$/.test(state) ||
    !userId
  ) {
    return false;
  }

  const result: unknown = await redis.eval(
    CONSUME_STATE_SCRIPT,
    {
      keys: [stateKey(state)],
      arguments: [],
    },
  );

  return result === userId;
}
