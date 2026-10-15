import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import aiRoutes from "./modules/ai/aiRoutes";
import databaseRoutes from "./routes/databaseRoutes";
import authRoutes from "./modules/authentication/auth.routes";
import passport from "passport";
import projectRoutes from "./modules/projects/project.routes";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

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
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

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

export default app;