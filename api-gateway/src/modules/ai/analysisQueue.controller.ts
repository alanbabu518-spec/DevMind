import type { Request, Response } from "express";
import { analysisQueue } from "./analysis.queue.js";
import type { CodeAnalysisJobData } from "./analysis.types.js";

interface QueueAnalysisBody {
  language?: unknown;
  source_code?: unknown;
  filename?: unknown;
}

function getJobId(req: Request): string | null {
  const id = req.params.jobId;

  return typeof id === "string" && id.trim() ? id : null;
}

export async function enqueueCodeAnalysis(
  req: Request<{}, {}, QueueAnalysisBody>,
  res: Response,
): Promise<void> {
  const {
    language = "python",
    source_code,
    filename = "submitted.py",
  } = req.body ?? {};

  if (typeof source_code !== "string" || !source_code.trim()) {
    res.status(400).json({
      status: "error",
      message: "Non-empty source_code is required.",
    });
    return;
  }

  if (source_code.length > 20000) {
    res.status(413).json({
      status: "error",
      message: "Source code must not exceed 20000 characters.",
    });
    return;
  }

  if (
    typeof language !== "string" ||
    language.trim().toLowerCase() !== "python"
  ) {
    res.status(400).json({
      status: "error",
      message: "Currently, only Python analysis is supported.",
    });
    return;
  }

  if (
    typeof filename !== "string" ||
    !filename.trim() ||
    filename.length > 100 ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    res.status(400).json({
      status: "error",
      message: "filename must be a simple filename of at most 100 characters.",
    });
    return;
  }

  try {
    const jobData: CodeAnalysisJobData = {
      userId: req.userId!,
      language: "python",
      source_code,
      filename,
    };

    const job = await analysisQueue.add("analyze-code", jobData);

    res.status(202).json({
      status: "accepted",
      message: "Code analysis job added to the queue.",
      data: {
        jobId: job.id,
        status: "waiting",
      },
    });
  } catch (error) {
    console.error("Unable to enqueue code analysis:", error);

    res.status(503).json({
      status: "error",
      message: "Unable to queue code analysis right now.",
    });
  }
}

export async function getCodeAnalysisJob(
  req: Request,
  res: Response,
): Promise<void> {
  const jobId = getJobId(req);

  if (!jobId) {
    res.status(400).json({
      status: "error",
      message: "A valid job ID is required.",
    });
    return;
  }

  try {
    const job = await analysisQueue.getJob(jobId);

    if (!job || job.data.userId !== req.userId) {
      res.status(404).json({
        status: "error",
        message: "Analysis job not found.",
      });
      return;
    }

    const state = await job.getState();

    const responseData: {
      jobId: string;
      status: string;
      result?: unknown;
      message?: string;
    } = {
      jobId: job.id ?? jobId,
      status: state,
    };

    if (state === "completed") {
      responseData.result = job.returnvalue;
    }

    if (state === "failed") {
      responseData.message = "Analysis failed after the available retries.";
    }

    res.status(200).json({
      status: "success",
      data: responseData,
    });
  } catch (error) {
    console.error("Unable to retrieve analysis job:", error);

    res.status(503).json({
      status: "error",
      message: "Unable to retrieve job status right now.",
    });
  }
}
