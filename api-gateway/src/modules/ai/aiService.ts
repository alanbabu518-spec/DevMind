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

export async function sendMessageToAI(
  message: string,
): Promise<AIServiceResult> {
  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

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
  const timeout = setTimeout(() => controller.abort(), 12000);

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
