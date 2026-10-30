import { prisma } from "../../lib/prisma";
import {
  encryptGitHubToken,
  decryptGitHubToken,
} from "../authentication/oauth/github-token-crypto";

const GITHUB_API = "https://api.github.com";

type GitHubConnectionProfile = {
  providerAccountId: string;
  username: string | null;
  accessToken: string;
};

type GitHubUserResponse = {
  login: string;
  id: number;
};

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  html_url: string;
  updated_at: string;
};

/**
 * An error the client is allowed to see. The routes turn it into a proper
 * HTTP status + a stable `code` instead of a generic 500.
 */
export class GitHubIntegrationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "GitHubIntegrationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Maps a failed GitHub API response to a typed, client-safe error. */
function failFromResponse(response: Response, fallback: string): never {
  if (response.status === 401) {
    throw new GitHubIntegrationError(
      "GitHub rejected the saved connection. Please reconnect GitHub.",
      409,
      "github_token_invalid",
    );
  }

  if (
    response.status === 403 &&
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    throw new GitHubIntegrationError(
      "GitHub rate limit reached. Please try again shortly.",
      429,
      "github_rate_limited",
    );
  }

  if (response.status === 404) {
    throw new GitHubIntegrationError(
      "Not found on GitHub, or you do not have access to it.",
      404,
      "github_not_found",
    );
  }

  throw new GitHubIntegrationError(fallback, 502, "github_upstream_error");
}

async function getGitHubProfile(
  accessToken: string,
): Promise<GitHubUserResponse> {
  const response = await fetch(`${GITHUB_API}/user`, {
    headers: githubHeaders(accessToken),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    failFromResponse(response, "Unable to verify the GitHub account");
  }

  return (await response.json()) as GitHubUserResponse;
}

async function getConnection(userId: string) {
  return prisma.account.findFirst({
    where: {
      userId,
      provider: "github-connect",
    },
    select: {
      id: true,
      providerAccountId: true,
      githubAccessTokenEncrypted: true,
    },
  });
}

export async function connectGitHubAccount(
  userId: string,
  profile: GitHubConnectionProfile,
): Promise<{ username: string; transferred: boolean }> {
  if (!userId || !profile.providerAccountId || !profile.accessToken) {
    throw new GitHubIntegrationError(
      "GitHub connection details are incomplete",
      400,
      "github_authorization_failed",
    );
  }

  // Verify the GitHub identity using the access token.
  const githubProfile = await getGitHubProfile(profile.accessToken);

  if (String(githubProfile.id) !== profile.providerAccountId) {
    throw new GitHubIntegrationError(
      "GitHub account identity could not be verified",
      400,
      "github_identity_unverified",
    );
  }

  // The user just proved they own this GitHub account by completing OAuth and
  // the token was verified against GitHub above, so the connection may belong
  // to whichever DevMind account they are signed in to right now.
  // If it was linked to another DevMind account (e.g. an older email), the
  // link MOVES to this account instead of failing.
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "github-connect",
        providerAccountId: profile.providerAccountId,
      },
    },
    select: {
      userId: true,
    },
  });

  const transferred = Boolean(
    existingAccount && existingAccount.userId !== userId,
  );
  const encryptedToken = encryptGitHubToken(profile.accessToken);

  await prisma.$transaction([
    // One connected GitHub account per DevMind user: replace any other one.
    prisma.account.deleteMany({
      where: {
        userId,
        provider: "github-connect",
        NOT: { providerAccountId: profile.providerAccountId },
      },
    }),
    prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "github-connect",
          providerAccountId: profile.providerAccountId,
        },
      },
      create: {
        provider: "github-connect",
        providerAccountId: profile.providerAccountId,
        userId,
        githubAccessTokenEncrypted: encryptedToken,
      },
      update: {
        userId,
        githubAccessTokenEncrypted: encryptedToken,
      },
    }),
  ]);

  return { username: githubProfile.login, transferred };
}

export async function getGitHubConnectionStatus(
  userId: string,
): Promise<{ connected: boolean; username?: string }> {
  const account = await getConnection(userId);

  if (!account?.githubAccessTokenEncrypted) {
    return { connected: false };
  }

  try {
    const token = decryptGitHubToken(account.githubAccessTokenEncrypted);
    const profile = await getGitHubProfile(token);

    return {
      connected: true,
      username: profile.login,
    };
  } catch (error) {
    // Previously swallowed silently. Log it so "connected: false" with a
    // saved token (bad encryption key, revoked token, GitHub timeout) is
    // visible in the server log.
    console.error(
      "[github] status check failed for a saved connection:",
      error instanceof Error ? error.message : error,
    );
    return { connected: false };
  }
}

async function getAccessToken(userId: string): Promise<string> {
  const account = await getConnection(userId);

  if (!account?.githubAccessTokenEncrypted) {
    throw new GitHubIntegrationError(
      "Connect GitHub before accessing repositories.",
      409,
      "github_not_connected",
    );
  }

  try {
    return decryptGitHubToken(account.githubAccessTokenEncrypted);
  } catch {
    throw new GitHubIntegrationError(
      "The saved GitHub connection could not be read. Please reconnect GitHub.",
      409,
      "github_token_unreadable",
    );
  }
}

export async function listGitHubRepositories(
  userId: string,
  search = "",
  page = 1,
) {
  const token = await getAccessToken(userId);
  const safePage = Math.min(Math.max(page, 1), 100);
  const params = new URLSearchParams({
    per_page: "30",
    page: String(safePage),
    sort: "updated",
  });

  const response = await fetch(
    `${GITHUB_API}/user/repos?${params.toString()}`,
    {
      headers: githubHeaders(token),
      signal: AbortSignal.timeout(25000),
    },
  );

  if (!response.ok) {
    failFromResponse(response, "Unable to load GitHub repositories");
  }

  const repositories = (await response.json()) as GitHubRepository[];

  const normalizedSearch = search.trim().toLowerCase();

  return repositories
    .filter((repo) =>
      `${repo.name} ${repo.full_name}`.toLowerCase().includes(normalizedSearch),
    )
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description,
      defaultBranch: repo.default_branch,
      url: repo.html_url,
      updatedAt: repo.updated_at,
    }));
}

export async function getGitHubRepositoryBranches(
  userId: string,
  owner: string,
  repo: string,
) {
  const token = await getAccessToken(userId);

  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
    {
      headers: githubHeaders(token),
      signal: AbortSignal.timeout(25000),
    },
  );

  if (!response.ok) {
    failFromResponse(response, "Unable to load repository branches");
  }

  const branches = (await response.json()) as Array<{
    name: string;
    protected: boolean;
  }>;

  return branches.map((branch) => ({
    name: branch.name,
    protected: branch.protected,
  }));
}

export async function getGitHubRepositoryContents(
  userId: string,
  owner: string,
  repo: string,
  path = "",
  ref?: string,
) {
  const token = await getAccessToken(userId);

  if (
    path.length > 1000 ||
    path.startsWith("/") ||
    path.split("/").includes("..")
  ) {
    throw new GitHubIntegrationError(
      "Invalid repository path",
      400,
      "invalid_path",
    );
  }

  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  const url = new URL(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
  );

  if (ref) {
    url.searchParams.set("ref", ref);
  }

  const response = await fetch(url, {
    headers: githubHeaders(token),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    failFromResponse(response, "Unable to load repository contents");
  }

  const payload: unknown = await response.json();

  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const entry = item as {
        name: string;
        path: string;
        type: string;
        size: number;
      };

      return {
        name: entry.name,
        path: entry.path,
        type: entry.type,
        size: entry.size,
      };
    });
  }

  const file = payload as {
    name: string;
    path: string;
    type: string;
    size: number;
    encoding?: string;
    content?: string;
  };

  if (file.type !== "file") {
    throw new GitHubIntegrationError(
      "Unsupported repository content type",
      415,
      "unsupported_content",
    );
  }

  if (file.size > 200_000) {
    throw new GitHubIntegrationError(
      "File is too large to load into the editor",
      413,
      "file_too_large",
    );
  }

  if (file.encoding !== "base64" || typeof file.content !== "string") {
    throw new GitHubIntegrationError(
      "GitHub returned an unsupported file encoding",
      502,
      "github_upstream_error",
    );
  }

  return {
    name: file.name,
    path: file.path,
    type: file.type,
    size: file.size,
    content: Buffer.from(file.content, "base64").toString("utf8"),
  };
}

export async function disconnectGitHubAccount(userId: string): Promise<void> {
  await prisma.account.deleteMany({
    where: {
      userId,
      provider: "github-connect",
    },
  });
}
