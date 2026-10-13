export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/projects${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = (await response.json()) as ApiResponse<T>;

  if (
    !response.ok ||
    result.status !== "success" ||
    result.data === undefined
  ) {
    throw new Error(
      result.message ?? "Unable to complete the project request.",
    );
  }

  return result.data;
}

export const projectsApi = {
  list(): Promise<{ projects: Project[] }> {
    return request("/");
  },

  get(id: string): Promise<{ project: Project }> {
    return request(`/${encodeURIComponent(id)}`);
  },

  create(input: {
    name: string;
    description?: string | null;
  }): Promise<{ project: Project }> {
    return request("/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(
    id: string,
    input: { name?: string; description?: string | null },
  ): Promise<{ project: Project }> {
    return request(`/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
