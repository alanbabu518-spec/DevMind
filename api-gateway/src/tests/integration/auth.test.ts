import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requestMagicLinkService,
  verifyMagicLinkService,
  createSession,
  deleteSession,
  findUnique,
  getSessionUserId,
} = vi.hoisted(() => ({
  requestMagicLinkService: vi.fn(),
  verifyMagicLinkService: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  findUnique: vi.fn(),
  getSessionUserId: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique,
    },
  },
}));

vi.mock("../../modules/authentication/auth.service", () => ({
  requestMagicLink: requestMagicLinkService,
  verifyMagicLink: verifyMagicLinkService,
}));

vi.mock("../../modules/authentication/session.service", () => ({
  createSession,
  deleteSession,
  getSessionUserId,
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

describe("Authentication API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  describe("POST /api/auth/magic-link", () => {
    it("accepts a valid email and returns a generic success response", async () => {
      requestMagicLinkService.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/magic-link")
        .send({ email: "developer@example.com" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "success",
      });

      expect(requestMagicLinkService).toHaveBeenCalledWith({
        email: "developer@example.com",
      });
    });

    it("rejects an invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/magic-link")
        .send({ email: "invalid-email" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(requestMagicLinkService).not.toHaveBeenCalled();
    });

    it("returns a generic error if the request fails", async () => {
      requestMagicLinkService.mockRejectedValue(
        new Error("Email delivery failed"),
      );

      const response = await request(app)
        .post("/api/auth/magic-link")
        .send({ email: "developer@example.com" });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(
        "Unable to process the sign-in request.",
      );
    });
  });

  describe("GET /api/auth/verify-magic-link", () => {
    it("rejects a missing token", async () => {
      const response = await request(app).get("/api/auth/verify-magic-link");

      expect(response.status).toBe(400);
      expect(createSession).not.toHaveBeenCalled();
    });

    it("rejects an invalid token", async () => {
      verifyMagicLinkService.mockResolvedValue(null);

      const response = await request(app).get(
        "/api/auth/verify-magic-link?token=invalid-token",
      );

      expect(response.status).toBe(401);
      expect(createSession).not.toHaveBeenCalled();
    });

    it("creates a session, sets a secure cookie configuration, and redirects to onboarding", async () => {
      verifyMagicLinkService.mockResolvedValue({
        user: {
          id: "user-1",
          email: "developer@example.com",
          name: "Developer",
        },
        isNewUser: true,
      });

      createSession.mockResolvedValue({
        token: "test-session-token",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      });

      const response = await request(app).get(
        "/api/auth/verify-magic-link?token=valid-token",
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:5174/devmind/onboarding?auth=success",
      );

      expect(verifyMagicLinkService).toHaveBeenCalledWith("valid-token");
      expect(createSession).toHaveBeenCalledWith("user-1");

      const cookie = response.headers["set-cookie"]?.[0];

      expect(cookie).toContain("devmind_session=test-session-token");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/");
      expect(cookie).not.toContain("Secure");
    });

    it("sets the Secure cookie attribute in production and redirects to onboarding", async () => {
      process.env.NODE_ENV = "production";

      verifyMagicLinkService.mockResolvedValue({
        user: {
          id: "user-1",
          email: "developer@example.com",
          name: "Developer",
        },
        isNewUser: false,
      });

      createSession.mockResolvedValue({
        token: "test-session-token",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      });

      const response = await request(app).get(
        "/api/auth/verify-magic-link?token=valid-token",
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:5174/devmind/onboarding?auth=success",
      );

      expect(createSession).toHaveBeenCalledWith("user-1");

      const cookie = response.headers["set-cookie"]?.[0];

      expect(cookie).toContain("devmind_session=test-session-token");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/");
    });
  });

  describe("GET /api/auth/me", () => {
    it("rejects requests without a session", async () => {
      getSessionUserId.mockResolvedValue(null);

      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
    });

    it("returns the current user for a valid session", async () => {
      getSessionUserId.mockResolvedValue("user-1");

      findUnique.mockResolvedValue({
        id: "user-1",
        email: "developer@example.com",
        name: "Developer",
        emailVerified: new Date("2026-01-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const response = await request(app)
        .get("/api/auth/me")
        .set("Cookie", "devmind_session=test-session-token");

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe("developer@example.com");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("deletes the session and clears the cookie", async () => {
      deleteSession.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", "devmind_session=test-session-token");

      expect(response.status).toBe(200);
      expect(deleteSession).toHaveBeenCalledWith("test-session-token");

      expect(response.headers["set-cookie"]?.[0]).toContain(
        "devmind_session=;",
      );
    });
  });
});
