import express, { Request, Response } from "express";
import { sendMessageToAI } from "../services/aiService.js";

const router = express.Router();

interface ChatRequestBody {
  message: string;
}

router.post(
  "/chat",
  async (
    req: Request<{}, {}, ChatRequestBody>,
    res: Response
  ) => {
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
      console.error("AI Service Error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "AI Service is unavailable";

      res.status(500).json({
        error: message,
      });
    }
  }
);

export default router;