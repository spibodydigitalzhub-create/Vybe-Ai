require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 4000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "VYBE AI API",
    status: "online"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    if (!messages.length) {
      return res.status(400).json({
        success: false,
        message: "Messages are required"
      });
    }

    const input = messages
      .filter(
        (item) =>
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content.trim()
      )
      .map((item) => ({
        role: item.role,
        content: item.content.trim()
      }));

    if (!input.length) {
      return res.status(400).json({
        success: false,
        message: "No valid messages were provided"
      });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      input
    });

    res.json({
      success: true,
      reply: response.output_text || "I couldn't generate a response."
    });
  } catch (error) {
    console.error("VYBE AI error:", error);

    res.status(500).json({
      success: false,
      message: "AI request failed"
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`VYBE AI API running on http://127.0.0.1:${PORT}`);
});
