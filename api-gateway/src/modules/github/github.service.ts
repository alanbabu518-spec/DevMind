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

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getGitHubProfile(
  accessToken: string,
): Promise<GitHubUserResponse> {
  const response = await fetch(`${GITHUB_API}/user`, {
    headers: githubHeaders(accessToken),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error("Unable to verify the GitHub account");
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
): Promise<{ username: string }> {
  if (!userId || !profile.providerAccountId || !profile.accessToken) {
    throw new Error("GitHub connection details are incomplete");
  }

  const githubProfile = await getGitHubProfile(profile.accessToken);

  if (String(githubProfile.id) !== profile.providerAccountId) {
    throw new Error("GitHub account identity could not be verified");
  }

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

  const existingSignInAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "github",
        providerAccountId: profile.providerAccountId,
      },
    },
    select: {
      userId: true,
    },
  });

  if (existingSignInAccount && existingSignInAccount.userId !== userId) {
    throw new Error("This GitHub identity belongs to another DevMind account");
  }

  if (existingAccount && existingAccount.userId !== userId) {
    throw new Error(
      "This GitHub account is already connected to another DevMind account",
    );
  }

  const encryptedToken = encryptGitHubToken(profile.accessToken);

  await prisma.account.upsert({
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
      githubAccessTokenEncrypted: encryptedToken,
    },
  });

  return { username: githubProfile.login };
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
  } catch {
    return { connected: false };
  }
}

async function getAccessToken(userId: string): Promise<string> {
  const account = await getConnection(userId);

  if (!account?.githubAccessTokenEncrypted) {
    throw new Error("Connect GitHub before accessing repositories");
  }

  return decryptGitHubToken(account.githubAccessTokenEncrypted);
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
    throw new Error("Unable to load GitHub repositories");
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
    throw new Error("Unable to load repository branches");
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
    throw new Error("Invalid repository path");
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
    throw new Error("Unable to load repository contents");
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
    throw new Error("Unsupported repository content type");
  }

  if (file.size > 200_000) {
    throw new Error("File is too large to load into the editor");
  }

  if (file.encoding !== "base64" || typeof file.content !== "string") {
    throw new Error("GitHub returned an unsupported file encoding");
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
