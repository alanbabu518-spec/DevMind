import "dotenv/config";

import express from "express";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => {
  res.json({
    service: "DevMind API Gateway",
    status: "running",
  });
});

app.use("/api/ai", aiRoutes);

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});