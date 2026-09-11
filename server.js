// JARVIS backend — the ONLY place the Groq API key is ever read.
// The frontend (jarvis.html) never sees this key.

import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());               // for local dev; restrict origin in production
app.use(express.json({ limit: "8mb" })); // 8mb to allow a base64 camera frame

const PORT = process.env.PORT || 3787;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview";

const JARVIS_SYSTEM_PROMPT = `You are JARVIS, a sophisticated, dry-witted British AI assistant.
Be concise, direct, and honest — never flatter needlessly, never invent certainty.
If you don't know something, say so plainly. Keep replies short enough to be spoken aloud.
You must never transcribe, read aloud, or describe any text, signs, screens or documents
visible in an image — vision is for objects/scenes/people only, never text (no OCR).`;

if (!GROQ_API_KEY) {
  console.warn("[jarvis-server] WARNING: GROQ_API_KEY is not set. /api/chat and /api/vision will fail.");
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    groqConfigured: !!GROQ_API_KEY,
    chatModel: CHAT_MODEL,
    visionModel: VISION_MODEL,
  });
});

// Plain conversational turn.
// body: { message: string, history: [{role:"user"|"assistant", content:string}] }
app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "Server has no GROQ_API_KEY configured." });
    }
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string." });
    }

    const messages = [
      { role: "system", content: JARVIS_SYSTEM_PROMPT },
      ...history.slice(-12).filter(
        (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      ),
      { role: "user", content: message },
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 400,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("[jarvis-server] Groq chat error:", groqRes.status, errText);
      return res.status(502).json({ error: "Upstream model error.", status: groqRes.status });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "";
    res.json({ reply });
  } catch (err) {
    console.error("[jarvis-server] /api/chat failed:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Vision turn — a single camera frame (base64 JPEG/PNG) plus a question.
// body: { image: "data:image/jpeg;base64,...", question: string }
// The system prompt above already forbids reading text in the image (no OCR).
app.post("/api/vision", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "Server has no GROQ_API_KEY configured." });
    }
    const { image, question = "Describe what you see, briefly." } = req.body || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:image")) {
      return res.status(400).json({ error: "Missing or invalid 'image' data URI." });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: JARVIS_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: question },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: 250,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("[jarvis-server] Groq vision error:", groqRes.status, errText);
      return res.status(502).json({ error: "Upstream vision model error.", status: groqRes.status });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "";
    res.json({ reply });
  } catch (err) {
    console.error("[jarvis-server] /api/vision failed:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});
app.get('/', (req, res) => { res.send('Server is running successfully!'); });
app.listen(PORT, () => {
  console.log(`[jarvis-server] listening on http://localhost:${PORT}`);
});
