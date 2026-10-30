const BASE = "/api/auth";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  profileCompleted: boolean;
  onboardingCompleted: boolean;
  selectedPlan: string | null;
  emailVerified: string | null;
  createdAt: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? "Something went wrong. Please try again.",
      response.status,
    );
  }
  return payload as T;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const result = await call<{ data: { user: CurrentUser } }>("/me");
  return result.data.user;
}

export async function saveProfile(input: {
  username?: string;
  avatar?: string;
  name?: string;
}): Promise<CurrentUser> {
  const result = await call<{ data: { user: CurrentUser } }>("/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return result.data.user;
}

export async function checkUsernameAvailable(
  username: string,
  signal?: AbortSignal,
): Promise<{ available: boolean; reason?: string }> {
  const result = await call<{
    data: { available: boolean; reason?: string };
  }>(`/username-available?username=${encodeURIComponent(username)}`, {
    signal,
  });
  return result.data;
}

export async function logoutRequest(): Promise<void> {
  await call("/logout", { method: "POST" });
}

export async function deleteAccountRequest(
  confirmation: string,
): Promise<void> {
  await call("/account", {
    method: "DELETE",
    body: JSON.stringify({ confirmation }),
  });
}
