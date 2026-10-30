/**
 * GitHub-style identicons: 5x5 grid, mirrored left to right, one colour on a
 * soft tint. Derived from a seed, so we only store the seed.
 */

export type Identicon = {
  cells: boolean[][];
  fill: string;
  tint: string;
};

const GRID = 5;

function hashSeed(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a =
    (Math.imul(h ^ (h >>> 16), 2246822507) ^
      Math.imul(h ^ (h >>> 13), 3266489909)) >>>
    0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildIdenticon(seed: string): Identicon {
  const rand = hashSeed(seed || "devmind");
  const hue = Math.floor(rand() * 360);

  const cells: boolean[][] = Array.from({ length: GRID }, () =>
    Array<boolean>(GRID).fill(false),
  );

  let filled = 0;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < 3; col++) {
      const on = rand() > 0.5;
      cells[row][col] = on;
      cells[row][GRID - 1 - col] = on;
      if (on) filled += col === 2 ? 1 : 2;
    }
  }

  if (filled < 7) {
    for (let row = 0; row < GRID; row++) cells[row][2] = true;
  }

  return {
    cells,
    fill: `hsl(${hue} 62% 46%)`,
    tint: `hsl(${hue} 38% 91%)`,
  };
}

const SEED_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomSeed(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join(
    "",
  );
}

export function randomSeeds(count: number): string[] {
  const seen = new Set<string>();
  while (seen.size < count) seen.add(randomSeed());
  return [...seen];
}

export const AVATAR_PREFIX = "identicon:";

export function avatarValue(seed: string): string {
  return `${AVATAR_PREFIX}${seed}`;
}

export function seedFromAvatar(
  avatar: string | null | undefined,
  fallback: string,
): string {
  if (avatar && avatar.startsWith(AVATAR_PREFIX)) {
    return avatar.slice(AVATAR_PREFIX.length);
  }
  return fallback.toLowerCase().replace(/[^a-z0-9]/g, "") || "devmind";
}

/** "Ada.Lovelace+test@example.com" -> "ada-lovelace-test" */
export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  let name = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");

  if (name.length < 3) {
    name = `${name || "dev"}${Math.floor(100 + Math.random() * 900)}`;
  }
  return name;
}

export const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateUsername(value: string): string | null {
  if (value.length < 3) return "At least 3 characters.";
  if (value.length > 30) return "At most 30 characters.";
  if (!USERNAME_PATTERN.test(value))
    return "Letters, numbers and single hyphens only.";
  return null;
}
