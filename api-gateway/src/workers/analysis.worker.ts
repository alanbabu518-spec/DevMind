import "dotenv/config";

import { Worker } from "bullmq";
import IORedis from "ioredis";
import { analyzeCodeWithAI } from "../modules/ai/aiService.js";
import {
  ANALYSIS_QUEUE_NAME,
  type CodeAnalysisJobData,
} from "../modules/ai/analysis.types.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on("error", (error: Error) => {
  console.error("Worker Redis connection error:", error.message);
});

const worker = new Worker<CodeAnalysisJobData>(
  ANALYSIS_QUEUE_NAME,
  async (job) => {
    console.log(`Processing analysis job: ${job.id}`);

    const { language, source_code, filename } = job.data;

    const result = await analyzeCodeWithAI({
      language,
      source_code,
      filename,
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`AI analysis failed with status ${result.status}`);
    }

    return result.data;
  },
  {
    connection,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Analysis job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Analysis job ${job?.id ?? "unknown"} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("Analysis worker error:", error.message);
});

async function shutdown(): Promise<void> {
  console.log("Shutting down analysis worker...");

  await worker.close();
  await connection.quit();
}

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});

console.log(`Analysis worker listening on "${ANALYSIS_QUEUE_NAME}"`);
