import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
  ANALYSIS_QUEUE_NAME,
  type CodeAnalysisJobData,
} from "./analysis.types.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on("error", (error: Error) => {
  console.error("Analysis queue Redis error:", error.message);
});

export const analysisQueue = new Queue<CodeAnalysisJobData>(
  ANALYSIS_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: false,
    },
  },
);
