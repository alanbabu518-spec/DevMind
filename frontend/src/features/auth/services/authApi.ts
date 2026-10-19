const API_BASE_URL = "/api/auth";

export async function completeOnboarding(
  selectedPlan: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/onboarding/complete`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selectedPlan }),
    },
  );

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(
      result?.message ?? "Unable to save onboarding progress.",
    );
  }
}