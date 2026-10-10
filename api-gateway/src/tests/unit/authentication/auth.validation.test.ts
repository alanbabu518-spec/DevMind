import { describe, expect, it } from "vitest";
import { requestMagicLinkSchema } from "../../../modules/authentication/auth.validation";

describe("requestMagicLinkSchema", () => {
  it("accepts a valid email address", () => {
    const result = requestMagicLinkSchema.safeParse({
      email: "developer@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("normalizes the email to lowercase", () => {
    const result = requestMagicLinkSchema.safeParse({
      email: "Developer@Example.com",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.email).toBe("developer@example.com");
    }
  });

  it("trims whitespace around the email", () => {
    const result = requestMagicLinkSchema.safeParse({
      email: "  developer@example.com  ",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.email).toBe("developer@example.com");
    }
  });

  it("rejects an invalid email address", () => {
    const result = requestMagicLinkSchema.safeParse({
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an email longer than 254 characters", () => {
    const result = requestMagicLinkSchema.safeParse({
      email: `${"a".repeat(243)}@example.com`,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = requestMagicLinkSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
