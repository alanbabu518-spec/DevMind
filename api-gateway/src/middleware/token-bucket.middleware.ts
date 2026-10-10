import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis";

const IP_BUCKET_CAPACITY = 5;
const IP_REFILL_INTERVAL_MS = 3 * 60 * 1000;

const EMAIL_BUCKET_CAPACITY = 3;
const EMAIL_REFILL_INTERVAL_MS = 5 * 60 * 1000;

const BUCKET_TTL_SECONDS = 24 * 60 * 60;

const TOKEN_BUCKET_SCRIPT = `
local capacity = tonumber(ARGV[1])
local refill_interval = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

local data = redis.call('HMGET', KEYS[1], 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])

if not tokens or not last_refill then
  tokens = capacity
  last_refill = now
end

local elapsed = math.max(0, now - last_refill)
local refill_count = math.floor(elapsed / refill_interval)

if refill_count > 0 then
  tokens = math.min(capacity, tokens + refill_count)
  last_refill = last_refill + refill_count * refill_interval
end

local allowed = 0
local retry_after = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  retry_after = math.max(
    1,
    math.ceil((refill_interval - (now - last_refill)) / 1000)
  )
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'last_refill', last_refill)
redis.call('EXPIRE', KEYS[1], ttl)

return {allowed, tokens, retry_after}
`;

async function consumeToken(
  key: string,
  capacity: number,
  refillIntervalMs: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const result = (await redis.eval(TOKEN_BUCKET_SCRIPT, {
    keys: [key],
    arguments: [
      String(capacity),
      String(refillIntervalMs),
      String(BUCKET_TTL_SECONDS),
    ],
  })) as number[];

  const [allowed, remaining, retryAfter] = result;

  return {
    allowed: allowed === 1,
    remaining,
    retryAfter,
  };
}

function getNormalizedEmail(req: Request): string | null {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || !("email" in body)) {
    return null;
  }

  const email = body.email;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return null;
  }

  return email.trim().toLowerCase();
}

export async function tokenBucketMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = req.ip ?? "unknown";
  const email = getNormalizedEmail(req);

  try {
    const ipBucket = await consumeToken(
      `auth:token-bucket:ip:${ip}`,
      IP_BUCKET_CAPACITY,
      IP_REFILL_INTERVAL_MS,
    );

    res.setHeader("X-RateLimit-IP-Limit", String(IP_BUCKET_CAPACITY));
    res.setHeader("X-RateLimit-IP-Remaining", String(ipBucket.remaining));

    if (!ipBucket.allowed) {
      res.setHeader("Retry-After", String(ipBucket.retryAfter));

      res.status(429).json({
        status: "error",
        message: "Too many sign-in requests. Please try again later.",
        retryAfterSeconds: ipBucket.retryAfter,
      });
      return;
    }

    if (email) {
      const emailHash = createHash("sha256").update(email).digest("hex");

      const emailBucket = await consumeToken(
        `auth:token-bucket:email:${emailHash}`,
        EMAIL_BUCKET_CAPACITY,
        EMAIL_REFILL_INTERVAL_MS,
      );

      res.setHeader("X-RateLimit-Email-Limit", String(EMAIL_BUCKET_CAPACITY));
      res.setHeader(
        "X-RateLimit-Email-Remaining",
        String(emailBucket.remaining),
      );

      if (!emailBucket.allowed) {
        res.setHeader("Retry-After", String(emailBucket.retryAfter));

        res.status(429).json({
          status: "error",
          message:
            "Too many sign-in requests for this email. Please try again later.",
          retryAfterSeconds: emailBucket.retryAfter,
        });
        return;
      }
    }

    next();
  } catch {
    res.status(503).json({
      status: "error",
      message: "Sign-in is temporarily unavailable. Please try again later.",
    });
  }
}
