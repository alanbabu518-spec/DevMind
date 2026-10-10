import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUnique,
  createUser,
  updateUser,
  createMagicLinkToken,
  consumeMagicLinkToken,
  sendMagicLinkEmail,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  createMagicLinkToken: vi.fn(),
  consumeMagicLinkToken: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
}));

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique,
      create: createUser,
      update: updateUser,
    },
  },
}));

vi.mock("../../../modules/authentication/magic-link.service", () => ({
  createMagicLinkToken,
  consumeMagicLinkToken,
}));

vi.mock("../../../lib/email", () => ({
  sendMagicLinkEmail,
}));

import {
  requestMagicLink,
  verifyMagicLink,
} from "../../../modules/authentication/auth.service";

describe("Authentication service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = "http://localhost:5173";
  });

  describe("requestMagicLink", () => {
    it("creates a token and sends a sign-in email", async () => {
      createMagicLinkToken.mockResolvedValue({
        token: "test-token",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      });

      sendMagicLinkEmail.mockResolvedValue(undefined);

      await requestMagicLink({ email: "developer@example.com" });

      expect(createMagicLinkToken).toHaveBeenCalledWith(
        "developer@example.com",
      );

      expect(sendMagicLinkEmail).toHaveBeenCalledWith(
        "developer@example.com",
        "http://localhost:5173/verify-email?token=test-token",
      );
    });

    it("throws when the frontend URL is missing", async () => {
      delete process.env.FRONTEND_URL;

      await expect(
        requestMagicLink({ email: "developer@example.com" }),
      ).rejects.toThrow("FRONTEND_URL is not configured");

      expect(createMagicLinkToken).not.toHaveBeenCalled();
      expect(sendMagicLinkEmail).not.toHaveBeenCalled();
    });

    it("propagates email delivery failures", async () => {
      createMagicLinkToken.mockResolvedValue({
        token: "test-token",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      });

      sendMagicLinkEmail.mockRejectedValue(new Error("Email delivery failed"));

      await expect(
        requestMagicLink({ email: "developer@example.com" }),
      ).rejects.toThrow("Email delivery failed");
    });
  });

  describe("verifyMagicLink", () => {
    it("returns null when the token is invalid or already used", async () => {
      consumeMagicLinkToken.mockResolvedValue(null);

      await expect(verifyMagicLink("invalid-token")).resolves.toBeNull();

      expect(findUnique).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    });

    it("creates a user for a valid token and a new email", async () => {
      consumeMagicLinkToken.mockResolvedValue("new@example.com");
      findUnique.mockResolvedValue(null);

      createUser.mockResolvedValue({
        id: "user-1",
        email: "new@example.com",
        name: null,
        emailVerified: new Date(),
      });

      const result = await verifyMagicLink("valid-token");

      expect(createUser).toHaveBeenCalledWith({
        data: {
          email: "new@example.com",
          emailVerified: expect.any(Date),
        },
      });

      expect(result).toEqual({
        user: {
          id: "user-1",
          email: "new@example.com",
          name: null,
        },
        isNewUser: true,
      });
    });

    it("returns an existing verified user without creating a duplicate", async () => {
      consumeMagicLinkToken.mockResolvedValue("existing@example.com");

      findUnique.mockResolvedValue({
        id: "user-2",
        email: "existing@example.com",
        name: "Developer",
        emailVerified: new Date(),
      });

      const result = await verifyMagicLink("valid-token");

      expect(createUser).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();

      expect(result).toEqual({
        user: {
          id: "user-2",
          email: "existing@example.com",
          name: "Developer",
        },
        isNewUser: false,
      });
    });

    it("verifies an existing user whose email is not yet verified", async () => {
      consumeMagicLinkToken.mockResolvedValue("existing@example.com");

      findUnique.mockResolvedValue({
        id: "user-2",
        email: "existing@example.com",
        name: "Developer",
        emailVerified: null,
      });

      updateUser.mockResolvedValue({
        id: "user-2",
        email: "existing@example.com",
        name: "Developer",
        emailVerified: new Date(),
      });

      const result = await verifyMagicLink("valid-token");

      expect(updateUser).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { emailVerified: expect.any(Date) },
      });

      expect(result).toMatchObject({
        user: {
          id: "user-2",
          email: "existing@example.com",
          name: "Developer",
        },
        isNewUser: false,
      });
    });

    it("handles a concurrent account creation conflict", async () => {
      consumeMagicLinkToken.mockResolvedValue("race@example.com");

      findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: "user-3",
        email: "race@example.com",
        name: "Developer",
        emailVerified: new Date(),
      });

      const conflict = Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
      });

      createUser.mockRejectedValue(conflict);

      const result = await verifyMagicLink("valid-token");

      expect(createUser).toHaveBeenCalledTimes(1);
      expect(findUnique).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        user: {
          id: "user-3",
          email: "race@example.com",
          name: "Developer",
        },
        isNewUser: false,
      });
    });

    it("rethrows a unique conflict if the competing user cannot be found", async () => {
      consumeMagicLinkToken.mockResolvedValue("race@example.com");
      findUnique.mockResolvedValue(null);

      const conflict = Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
      });

      createUser.mockRejectedValue(conflict);

      await expect(verifyMagicLink("valid-token")).rejects.toBe(conflict);

      expect(findUnique).toHaveBeenCalledTimes(2);
    });

    it("propagates unexpected account creation errors", async () => {
      consumeMagicLinkToken.mockResolvedValue("new@example.com");
      findUnique.mockResolvedValue(null);

      const databaseError = new Error("Database unavailable");
      createUser.mockRejectedValue(databaseError);

      await expect(verifyMagicLink("valid-token")).rejects.toBe(databaseError);
    });
  });
});
