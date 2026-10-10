import "dotenv/config";

import app from "./app";
import { connectRedis } from "./lib/redis";

const PORT = Number(process.env.PORT) || 5000;

async function startServer(): Promise<void> {
  await connectRedis();

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
}

startServer().catch((error: unknown) => {
  console.error("Failed to start API Gateway:", error);
  process.exitCode = 1;
});
