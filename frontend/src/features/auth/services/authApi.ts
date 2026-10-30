export const AUTH_API_BASE = "/api/auth";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarId: string;
  profileCompleted: boolean;
  onboardingCompleted: boolean;
  selectedPlan: string | null;
  createdAt: string;
  emailVerified?: string | null;
};

async function readResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status})`);
  }
  return result as T;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await fetch(`${AUTH_API_BASE}/me`, {
    credentials: "include",
  });
  const result = await readResponse<{ data: { user: CurrentUser } }>(response);
  return result.data.user;
}

export async function updateProfile(input: {
  username: string;
  avatarId: string;
}): Promise<CurrentUser> {
  const response = await fetch(`${AUTH_API_BASE}/profile`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await readResponse<{ data: { user: CurrentUser } }>(response);
  return result.data.user;
}

export async function deleteAccount(): Promise<void> {
  const response = await fetch(`${AUTH_API_BASE}/account`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
  await readResponse(response);
}

export async function logout(): Promise<void> {
  const response = await fetch(`${AUTH_API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
  await readResponse(response);
}

export async function completeOnboarding(selectedPlan: string): Promise<void> {
  const response = await fetch(`${AUTH_API_BASE}/onboarding/complete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedPlan }),
  });
  await readResponse(response);
}
