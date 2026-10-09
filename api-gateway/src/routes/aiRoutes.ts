import express, { Request, Response } from "express";
import { sendMessageToAI } from "../services/aiService.js";

const router = express.Router();

interface ChatRequestBody {
  message: string;
}

router.post(
  "/chat",
  async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
    try {
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        res.status(400).json({
          error: "Message is required",
        });
        return;
      }

      const result = await sendMessageToAI(message);

      res.status(result.status).json(result.data);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "DevMind API Gateway",
          message: "AI chat request failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );

      res.status(502).json({
        error: "AI service is currently unavailable",
      });
    }
  },
);

export default router;
