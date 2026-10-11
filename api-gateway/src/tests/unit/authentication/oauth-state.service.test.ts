import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRedisSet, mockRedisEval } = vi.hoisted(() => ({
  mockRedisSet: vi.fn(),
  mockRedisEval: vi.fn(),
}));

vi.mock("../../../lib/redis", () => ({
  redis: {
    set: mockRedisSet,
    eval: mockRedisEval,
  },
}));

import {
  consumeOAuthState,
  createOAuthState,
} from "../../../modules/authentication/oauth/oauth-state.service";

describe("OAuth state service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a random state and stores its provider with a TTL", async () => {
    mockRedisSet.mockResolvedValue("OK");

    const state = await createOAuthState("google");

    expect(state).toMatch(/^[a-f0-9]{64}$/);
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:oauth-state:[a-f0-9]{64}$/),
      "google",
      { EX: 600 },
    );
  });

  it("generates a different state for each login attempt", async () => {
    mockRedisSet.mockResolvedValue("OK");

    const firstState = await createOAuthState("google");
    const secondState = await createOAuthState("google");

    expect(firstState).not.toBe(secondState);
  });

  it("accepts a state when Redis returns the matching provider", async () => {
    mockRedisEval.mockResolvedValue("google");

    const state = "a".repeat(64);
    const valid = await consumeOAuthState(state, "google");

    const expectedHash = createHash("sha256").update(state).digest("hex");

    expect(valid).toBe(true);
    expect(mockRedisEval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("GET", KEYS[1])'),
      {
        keys: [`auth:oauth-state:${expectedHash}`],
        arguments: [],
      },
    );
  });

  it("rejects a state belonging to a different provider", async () => {
    mockRedisEval.mockResolvedValue("github");

    const valid = await consumeOAuthState("a".repeat(64), "google");

    expect(valid).toBe(false);
  });

  it("rejects an expired or already-consumed state", async () => {
    mockRedisEval.mockResolvedValue(null);

    const valid = await consumeOAuthState("a".repeat(64), "google");

    expect(valid).toBe(false);
  });

  it("rejects malformed states without querying Redis", async () => {
    const invalidStates: unknown[] = [
      undefined,
      null,
      "",
      "not-a-state",
      "A".repeat(64),
      "a".repeat(63),
      "g".repeat(64),
    ];

    for (const state of invalidStates) {
      await expect(consumeOAuthState(state, "google")).resolves.toBe(false);
    }

    expect(mockRedisEval).not.toHaveBeenCalled();
  });
});
