import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../routes/databaseRoutes", async () => {
  const { Router } = await import("express");

  return {
    default: Router(),
  };
});

vi.mock("../../modules/authentication/auth.routes", async () => {
  const { Router } = await import("express");

  return {
    default: Router(),
  };
});

// Mock Redis so the health tests do not require a Redis connection.
vi.mock("../../lib/redis", () => ({
  redis: {
    isOpen: false,
    on: vi.fn(),
    connect: vi.fn(),
  },
  connectRedis: vi.fn(),
}));

// Mock Prisma so the health tests do not require DATABASE_URL or PostgreSQL.
vi.mock("../../lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import app from "../../app";

describe("Health API", () => {
  it("returns a successful health response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "DevMind API Gateway",
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it("returns the gateway service information at the root endpoint", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      service: "DevMind API Gateway",
      status: "running",
    });
  });
});
