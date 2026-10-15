const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

interface AIServiceResult {
  status: number;
  data: unknown;
}

export interface CodeAnalysisRequest {
  language: string;
  source_code: string;
  filename: string;
}

// Timeout for simple AI chat requests: 10 seconds.
const CHAT_TIMEOUT_MS = 120000;

// Analysis can take longer because it runs scanners and may
// try multiple AI models.
const ANALYSIS_TIMEOUT_MS = 180_000;

export async function sendMessageToAI(
  message: string,
): Promise<AIServiceResult> {
  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL is not configured");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    const data: unknown = await response.json();

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI Service request timed out");
    }

    throw new Error("Unable to connect to AI Service");
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeCodeWithAI(
  request: CodeAnalysisRequest,
): Promise<AIServiceResult> {
  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL is not configured");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const data: unknown = await response.json();

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI Service analysis request timed out");
    }

    throw new Error("Unable to connect to AI Service");
  } finally {
    clearTimeout(timeout);
  }
}

export async function calculateReadinessWithAI(
  request: CodeAnalysisRequest,
): Promise<AIServiceResult> {
  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/readiness`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const data: unknown = await response.json();

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI Service readiness request timed out");
    }

    throw new Error("Unable to connect to AI Service");
  } finally {
    clearTimeout(timeout);
  }
}
