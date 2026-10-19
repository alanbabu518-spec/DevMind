import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY is not configured",
    );
  }

  const key = Buffer.from(encodedKey, "base64");

  if (
    key.length !== KEY_LENGTH ||
    key.toString("base64") !== encodedKey
  ) {
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }

  return key;
}

export function encryptGitHubToken(token: string): string {
  if (!token.trim()) {
    throw new Error("GitHub access token cannot be empty");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptGitHubToken(
  encryptedToken: string,
): string {
  const parts = encryptedToken.split(":");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted GitHub token format");
  }

  const [, encodedIv, encodedTag, encodedCiphertext] = parts;

  const iv = Buffer.from(encodedIv, "base64");
  const authTag = Buffer.from(encodedTag, "base64");
  const ciphertext = Buffer.from(encodedCiphertext, "base64");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== 16 ||
    !encodedCiphertext
  ) {
    throw new Error("Invalid encrypted GitHub token data");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
