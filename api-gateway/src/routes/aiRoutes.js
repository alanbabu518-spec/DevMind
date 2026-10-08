const express = require("express");
const { sendMessageToAI } = require("../services/aiService");

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const result = await sendMessageToAI(message);

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("AI Service Error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;