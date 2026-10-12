import { prisma } from "../../lib/prisma";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.validation";

export async function createProject(ownerId: string, data: CreateProjectInput) {
  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      ownerId,
    },
  });
}

export async function listProjects(ownerId: string) {
  return prisma.project.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(ownerId: string, projectId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId,
    },
  });
}

export async function updateProject(
  ownerId: string,
  projectId: string,
  data: UpdateProjectInput,
) {
  const result = await prisma.project.updateMany({
    where: {
      id: projectId,
      ownerId,
    },
    data,
  });

  if (result.count === 0) {
    return null;
  }

  return getProject(ownerId, projectId);
}

export async function deleteProject(ownerId: string, projectId: string) {
  const result = await prisma.project.deleteMany({
    where: {
      id: projectId,
      ownerId,
    },
  });

  return result.count > 0;
}
