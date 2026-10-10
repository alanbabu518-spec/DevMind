import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

const { redisEval } = vi.hoisted(() => ({
  redisEval: vi.fn(),
}));

vi.mock("../../lib/redis", () => ({
  redis: {
    eval: redisEval,
  },
}));

import { tokenBucketMiddleware } from "../../middleware/token-bucket.middleware";

function createMocks(body: unknown = { email: "developer@example.com" }) {
  const req = {
    ip: "127.0.0.1",
    body,
  } as Request;

  const headers: Record<string, string> = {};
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
      return res;
    }),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next, headers };
}

describe("Token Bucket middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a request when both buckets have tokens", async () => {
    redisEval.mockResolvedValueOnce([1, 4, 0]).mockResolvedValueOnce([1, 2, 0]);

    const { req, res, next, headers } = createMocks();

    await tokenBucketMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(headers["X-RateLimit-IP-Remaining"]).toBe("4");
    expect(headers["X-RateLimit-Email-Remaining"]).toBe("2");
  });

  it("blocks a request when the IP bucket is empty", async () => {
    redisEval.mockResolvedValueOnce([0, 0, 120]);

    const { req, res, next } = createMocks();

    await tokenBucketMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
    expect(redisEval).toHaveBeenCalledOnce();
  });

  it("blocks a request when the email bucket is empty", async () => {
    redisEval
      .mockResolvedValueOnce([1, 4, 0])
      .mockResolvedValueOnce([0, 0, 180]);

    const { req, res, next } = createMocks();

    await tokenBucketMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
    expect(redisEval).toHaveBeenCalledTimes(2);
  });

  it("returns 503 when Redis fails", async () => {
    redisEval.mockRejectedValueOnce(new Error("Redis unavailable"));

    const { req, res, next } = createMocks();

    await tokenBucketMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("skips the email bucket when the email format is invalid", async () => {
    redisEval.mockResolvedValueOnce([1, 4, 0]);

    const { req, res, next } = createMocks({
      email: "not-an-email",
    });

    await tokenBucketMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(redisEval).toHaveBeenCalledOnce();
  });
});
