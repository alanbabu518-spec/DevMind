import express, { Request, Response } from "express";
import {
  analyzeCodeWithAI,
  calculateReadinessWithAI,
  sendMessageToAI,
} from "./aiService.js";
import { requireAuthentication } from "../../middleware/auth.middleware.js";
import {
  enqueueCodeAnalysis,
  getCodeAnalysisJob,
} from "./analysisQueue.controller.js";

const router = express.Router();

interface ChatRequestBody {
  message: string;
}

interface CodeAnalysisBody {
  language?: string;
  source_code?: string;
  filename?: string;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  py: "python",
  python: "python",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  javascript: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  typescript: "typescript",
  go: "go",
  golang: "go",
  rb: "ruby",
  ruby: "ruby",
  c: "c",
  h: "c",
  cpp: "cpp",
  "c++": "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  auto: "auto",
};

const SUPPORTED_LANGUAGE_LABELS =
  "Python, JavaScript, TypeScript, Go, Ruby, C, and C++";

router.post(
  "/chat",
  async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
    try {
      const { message } = req.body;
      if (typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "Message is required" });
        return;
      }
      const result = await sendMessageToAI(message);
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("AI chat request failed:", error);
      res.status(502).json({ error: "AI service is currently unavailable" });
    }
  },
);

router.post(
  "/analyze",
  async (req: Request<{}, {}, CodeAnalysisBody>, res: Response) => {
    try {
      const {
        language = "auto",
        source_code,
        filename = "submitted.txt",
      } = req.body;
      if (typeof source_code !== "string" || !source_code.trim()) {
        res.status(400).json({ error: "Non-empty source_code is required" });
        return;
      }
      if (source_code.length > 20000) {
        res
          .status(413)
          .json({ error: "Source code must not exceed 20000 characters" });
        return;
      }
      if (typeof language !== "string") {
        res.status(400).json({ error: "language must be a string" });
        return;
      }
      const normalizedLanguage = language.trim().toLowerCase();
      const supportedLanguage = LANGUAGE_ALIASES[normalizedLanguage];
      if (!supportedLanguage) {
        res.status(400).json({
          error: `Unsupported language. Supported languages: ${SUPPORTED_LANGUAGE_LABELS}.`,
        });
        return;
      }
      if (
        typeof filename !== "string" ||
        !filename.trim() ||
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
        language: supportedLanguage,
        source_code,
        filename,
      });
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("AI code analysis request failed:", error);
      res
        .status(502)
        .json({ error: "AI analysis service is currently unavailable" });
    }
  },
);

// Readiness scoring remains Python-only until its scoring evidence supports other languages.
router.post(
  "/readiness",
  async (req: Request<{}, {}, CodeAnalysisBody>, res: Response) => {
    try {
      const {
        language = "python",
        source_code,
        filename = "submitted.py",
      } = req.body;
      if (typeof source_code !== "string" || !source_code.trim()) {
        res.status(400).json({ error: "Non-empty source_code is required" });
        return;
      }
      if (source_code.length > 20000) {
        res
          .status(413)
          .json({ error: "Source code must not exceed 20000 characters" });
        return;
      }
      if (
        typeof language !== "string" ||
        language.trim().toLowerCase() !== "python"
      ) {
        res
          .status(400)
          .json({
            error: "Currently, only Python readiness analysis is supported",
          });
        return;
      }
      if (
        typeof filename !== "string" ||
        !filename.trim() ||
        filename.length > 100 ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        res.status(400).json({
          error: "filename must be a simple filename of at most 100 characters",
        });
        return;
      }
      const result = await calculateReadinessWithAI({
        language: "python",
        source_code,
        filename,
      });
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("AI readiness request failed:", error);
      res
        .status(502)
        .json({ error: "AI readiness service is currently unavailable" });
    }
  },
);

router.post("/analyze/queue", requireAuthentication, enqueueCodeAnalysis);
router.get("/jobs/:jobId", requireAuthentication, getCodeAnalysisJob);

export default router;
