import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/health/database", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "success",
      service: "DevMind API Gateway",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      service: "DevMind API Gateway",
      database: "disconnected",
    });
  }
});

export default router;