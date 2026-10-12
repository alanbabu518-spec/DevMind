export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
}

export function validateCreateProject(body: unknown): {
  data?: CreateProjectInput;
  error?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be an object." };
  }

  const input = body as Record<string, unknown>;

  if (typeof input.name !== "string" || !input.name.trim()) {
    return { error: "Project name is required." };
  }

  if (input.name.trim().length > 100) {
    return { error: "Project name must not exceed 100 characters." };
  }

  if (
    input.description !== undefined &&
    input.description !== null &&
    typeof input.description !== "string"
  ) {
    return { error: "Description must be a string or null." };
  }

  if (
    typeof input.description === "string" &&
    input.description.length > 1000
  ) {
    return { error: "Description must not exceed 1000 characters." };
  }

  return {
    data: {
      name: input.name.trim(),
      description:
        typeof input.description === "string"
          ? input.description.trim() || null
          : input.description,
    },
  };
}

export function validateUpdateProject(body: unknown): {
  data?: UpdateProjectInput;
  error?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be an object." };
  }

  const input = body as Record<string, unknown>;
  const allowedFields = ["name", "description"];

  if (Object.keys(input).length === 0) {
    return { error: "Provide at least one field to update." };
  }

  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return { error: "Only name and description can be updated." };
  }

  const data: UpdateProjectInput = {};

  if ("name" in input) {
    if (typeof input.name !== "string" || !input.name.trim()) {
      return { error: "Project name cannot be empty." };
    }

    if (input.name.trim().length > 100) {
      return { error: "Project name must not exceed 100 characters." };
    }

    data.name = input.name.trim();
  }

  if ("description" in input) {
    if (input.description !== null && typeof input.description !== "string") {
      return { error: "Description must be a string or null." };
    }

    if (
      typeof input.description === "string" &&
      input.description.length > 1000
    ) {
      return { error: "Description must not exceed 1000 characters." };
    }

    data.description =
      typeof input.description === "string"
        ? input.description.trim() || null
        : null;
  }

  return { data };
}
