import { describe, expect, it } from "vitest";
import {
  avatarSchema,
  updateProfileSchema,
  usernameSchema,
} from "../../../modules/authentication/auth.validation";

describe("usernameSchema", () => {
  it("accepts and lowercases a valid handle", () => {
    const result = usernameSchema.safeParse("  Ada-Lovelace ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("ada-lovelace");
  });

  it.each([
    "ab",
    "-ada",
    "ada-",
    "ada--l",
    "ada_l",
    "ada lovelace",
    "a".repeat(31),
  ])("rejects %s", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });

  it("rejects reserved names", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
  });
});

describe("avatarSchema", () => {
  it("accepts identicon descriptors only", () => {
    expect(avatarSchema.safeParse("identicon:k3j9x2ab").success).toBe(true);
    expect(avatarSchema.safeParse("https://evil.test/a.png").success).toBe(
      false,
    );
    expect(avatarSchema.safeParse("identicon:../x").success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("requires at least one field", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
    expect(updateProfileSchema.safeParse({ name: "Ada" }).success).toBe(true);
  });
});
