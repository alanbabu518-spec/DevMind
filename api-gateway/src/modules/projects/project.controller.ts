import type { Request, Response } from "express";
import * as projectService from "./project.service";
import {
  validateCreateProject,
  validateUpdateProject,
} from "./project.validation";

function getProjectId(req: Request): string | null {
  const id = req.params.id;
  return typeof id === "string" ? id : null;
}

export async function createProject(
  req: Request,
  res: Response,
): Promise<void> {
  const validation = validateCreateProject(req.body);

  if (!validation.data) {
    res.status(400).json({
      status: "error",
      message: validation.error,
    });
    return;
  }

  try {
    const project = await projectService.createProject(
      req.userId!,
      validation.data,
    );

    res.status(201).json({
      status: "success",
      data: { project },
    });
  } catch (error) {
    console.error("Create project failed:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to create project.",
    });
  }
}

export async function listProjects(req: Request, res: Response): Promise<void> {
  try {
    const projects = await projectService.listProjects(req.userId!);

    res.status(200).json({
      status: "success",
      data: { projects },
    });
  } catch (error) {
    console.error("List projects failed:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve projects.",
    });
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const projectId = getProjectId(req);

  if (!projectId) {
    res.status(400).json({
      status: "error",
      message: "Invalid project ID.",
    });
    return;
  }

  try {
    const project = await projectService.getProject(req.userId!, projectId);

    if (!project) {
      res.status(404).json({
        status: "error",
        message: "Project not found.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: { project },
    });
  } catch (error) {
    console.error("Get project failed:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve project.",
    });
  }
}

export async function updateProject(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = getProjectId(req);

  if (!projectId) {
    res.status(400).json({
      status: "error",
      message: "Invalid project ID.",
    });
    return;
  }

  const validation = validateUpdateProject(req.body);

  if (!validation.data) {
    res.status(400).json({
      status: "error",
      message: validation.error,
    });
    return;
  }

  try {
    const project = await projectService.updateProject(
      req.userId!,
      projectId,
      validation.data,
    );

    if (!project) {
      res.status(404).json({
        status: "error",
        message: "Project not found.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: { project },
    });
  } catch (error) {
    console.error("Update project failed:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to update project.",
    });
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = getProjectId(req);

  if (!projectId) {
    res.status(400).json({
      status: "error",
      message: "Invalid project ID.",
    });
    return;
  }

  try {
    const deleted = await projectService.deleteProject(req.userId!, projectId);

    if (!deleted) {
      res.status(404).json({
        status: "error",
        message: "Project not found.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Project deleted successfully.",
    });
  } catch (error) {
    console.error("Delete project failed:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to delete project.",
    });
  }
}
