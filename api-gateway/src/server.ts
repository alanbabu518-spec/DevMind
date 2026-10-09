import "dotenv/config";

import express from "express";
import aiRoutes from "./routes/aiRoutes.js";
import databaseRoutes from "./routes/databaseRoutes";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "DevMind API Gateway",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({
    service: "DevMind API Gateway",
    status: "running",
  });
});

app.use("/api/ai", aiRoutes);
app.use("/", databaseRoutes);

app.get("/ready", async (_req, res) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL;

  if (!aiServiceUrl) {
    res.status(503).json({
      status: "not_ready",
      service: "DevMind API Gateway",
      reason: "AI service URL is not configured",
    });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${aiServiceUrl}/health`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      res.status(503).json({
        status: "not_ready",
        service: "DevMind API Gateway",
        dependencies: {
          aiService: "unavailable",
        },
      });
      return;
    }

    res.status(200).json({
      status: "ready",
      service: "DevMind API Gateway",
      dependencies: {
        aiService: "available",
      },
    });
  } catch {
    res.status(503).json({
      status: "not_ready",
      service: "DevMind API Gateway",
      dependencies: {
        aiService: "unavailable",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: "info",
      message: "API Gateway started",
      port: PORT,
      environment: process.env.NODE_ENV || "development",
    }),
  );
});
