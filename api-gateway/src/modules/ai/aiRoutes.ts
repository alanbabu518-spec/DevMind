import express, { Request, Response } from "express";
import { analyzeCodeWithAI, sendMessageToAI } from "./aiService.js";

const router = express.Router();

interface ChatRequestBody {
  message: string;
}

interface CodeAnalysisBody {
  language?: string;
  source_code?: string;
  filename?: string;
}

router.post(
  "/chat",
  async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
    try {
      const { message } = req.body;

      if (typeof message !== "string" || !message.trim()) {
        res.status(400).json({
          error: "Message is required",
        });
        return;
      }

      const result = await sendMessageToAI(message);

      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("AI chat request failed:", error);

      res.status(502).json({
        error: "AI service is currently unavailable",
      });
    }
  },
);

router.post(
  "/analyze",
  async (req: Request<{}, {}, CodeAnalysisBody>, res: Response) => {
    try {
      const {
        language = "python",
        source_code,
        filename = "submitted.py",
      } = req.body;

      if (typeof source_code !== "string" || !source_code.trim()) {
        res.status(400).json({
          error: "Non-empty source_code is required",
        });
        return;
      }

      if (source_code.length > 20000) {
        res.status(413).json({
          error: "Source code must not exceed 20000 characters",
        });
        return;
      }

      if (
        typeof language !== "string" ||
        language.trim().toLowerCase() !== "python"
      ) {
        res.status(400).json({
          error: "Currently, only Python analysis is supported",
        });
        return;
      }

      if (
        typeof filename !== "string" ||
        filename.length > 100 ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        res.status(400).json({
          error: "filename must be a simple filename of at most 100 characters",
        });
        return;
      }

      const result = await analyzeCodeWithAI({
        language: "python",
        source_code,
        filename,
      });

      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("AI code analysis request failed:", error);

      res.status(502).json({
        error: "AI analysis service is currently unavailable",
      });
    }
  },
);

export default router;
