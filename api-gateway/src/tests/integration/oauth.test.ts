
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSession,
  deleteSession,
  getSessionUserId,
  findUnique,
  createOAuthState,
  consumeOAuthState,
  mockPassportInitialize,
  mockPassportAuthenticate,
  mockOAuthMiddlewareCalls,
} = vi.hoisted(() => {
  const mockOAuthMiddlewareCalls = vi.fn();

  return {
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getSessionUserId: vi.fn(),
    findUnique: vi.fn(),
    createOAuthState: vi.fn(),
    consumeOAuthState: vi.fn(),
    mockOAuthMiddlewareCalls,
    mockPassportInitialize: vi.fn(
      () => (_req: unknown, _res: unknown, next: (error?: Error) => void) =>
        next(),
    ),
    mockPassportAuthenticate: vi.fn(
      (_strategy: string, _options: unknown) =>
        (
          req: {
            path: string;
            user?: { id: string };
          },
          _res: unknown,
          next: (error?: Error) => void,
        ) => {
          mockOAuthMiddlewareCalls();

          if (req.path.includes("/callback")) {
            req.user = { id: "oauth-user-1" };
          }

          next();
        },
    ),
  };
});

vi.mock("passport", () => ({
  default: {
    initialize: mockPassportInitialize,
    authenticate: mockPassportAuthenticate,
  },
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique,
    },
  },
}));

vi.mock("../../modules/authentication/auth.service", () => ({
  requestMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
}));

vi.mock("../../modules/authentication/session.service", () => ({
  createSession,
  deleteSession,
  getSessionUserId,
}));

vi.mock("../../modules/authentication/oauth/oauth-state.service", () => ({
  createOAuthState,
  consumeOAuthState,
}));

vi.mock("../../lib/redis", () => ({
  redis: {
    eval: vi.fn().mockResolvedValue([1, 4, 0]),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    isOpen: true,
    connect: vi.fn(),
  },
}));

import app from "../../app";

describe("OAuth callback security", () => {
  const state = "a".repeat(64);

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NODE_ENV = "test";
    process.env.FRONTEND_URL = "http://localhost:5174";

    consumeOAuthState.mockResolvedValue(true);

    createSession.mockResolvedValue({
      token: "test-session-token",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    // Treat the account as an onboarding-incomplete user by default.
    findUnique.mockResolvedValue({
      onboardingCompleted: false,
    });
  });

  describe("Google OAuth callback", () => {
    it("rejects a callback when the state cookie is missing", async () => {
      const response = await request(app).get(
        `/api/auth/oauth/google/callback?state=${state}`,
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:5174/onboarding?oauth=error&provider=google",
      );

      expect(consumeOAuthState).not.toHaveBeenCalled();
      expect(mockOAuthMiddlewareCalls).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    });

    it("rejects a callback when the cookie and query states differ", async () => {
      const response = await request(app)
        .get(`/api/auth/oauth/google/callback?state=${state}`)
        .set("Cookie", `devmind_oauth_state_google=${"b".repeat(64)}`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("oauth=error");
      expect(consumeOAuthState).not.toHaveBeenCalled();
      expect(mockOAuthMiddlewareCalls).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    });

    it("rejects an expired or already-consumed state", async () => {
      consumeOAuthState.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/auth/oauth/google/callback?state=${state}`)
        .set("Cookie", `devmind_oauth_state_google=${state}`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("oauth=error");
      expect(consumeOAuthState).toHaveBeenCalledWith(state, "google");
      expect(mockOAuthMiddlewareCalls).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    });

    it("rejects a state that belongs to another provider", async () => {
      consumeOAuthState.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/auth/oauth/google/callback?state=${state}`)
        .set("Cookie", `devmind_oauth_state_google=${state}`);

      expect(response.status).toBe(302);
      expect(consumeOAuthState).toHaveBeenCalledWith(state, "google");
      expect(createSession).not.toHaveBeenCalled();
    });

    it("accepts matching state and creates a session", async () => {
      const response = await request(app)
        .get(`/api/auth/oauth/google/callback?state=${state}`)
        .set("Cookie", `devmind_oauth_state_google=${state}`);

      expect(consumeOAuthState).toHaveBeenCalledWith(state, "google");
      expect(mockOAuthMiddlewareCalls).toHaveBeenCalledTimes(1);
      expect(createSession).toHaveBeenCalledWith("oauth-user-1");

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:5174/onboarding?oauth=success&provider=google",
      );

      const cookies = response.headers["set-cookie"] ?? "";

      expect(String(cookies)).toContain("devmind_session=test-session-token");
    });

    it("redirects a completed account to Home", async () => {
      findUnique.mockResolvedValue({
        onboardingCompleted: true,
      });

      const response = await request(app)
        .get(`/api/auth/oauth/google/callback?state=${state}`)
        .set("Cookie", `devmind_oauth_state_google=${state}`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:5174/Home?oauth=success&provider=google",
      );
    });
  });

  describe("GitHub OAuth callback", () => {
    it("rejects a Google state cookie on the GitHub callback", async () => {
      const response = await request(app)
        .get(`/api/auth/oauth/github/callback?state=${state}`)
        .set("Cookie", `devmind_oauth_state_google=${state}`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(
        "oauth=error&provider=github",
      );

      expect(consumeOAuthState).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    });

    it("rejects a GitHub callback when Redis state validation fails", async () => {
      consumeOAuthState.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/auth/oauth/github/callback?state=${state}`)
        .set("Cookie", `devmind_oauth_state_github=${state}`);

      expect(response.status).toBe(302);
      expect(consumeOAuthState).toHaveBeenCalledWith(state, "github");
      expect(mockOAuthMiddlewareCalls).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    });
  });
});
