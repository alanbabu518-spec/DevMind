const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

async function sendMessageToAI(message) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("AI Service request timed out");
    }

    throw new Error("Unable to connect to AI Service");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendMessageToAI,
};