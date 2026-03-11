import "dotenv/config";
import express from "express";
import { TRANSCRIPT_MARCH, TRANSCRIPT_SEPTEMBER } from "./src/transcripts.js";

const app = express();
app.use(express.json());

app.post("/api/extract", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "ANTHROPIC_API_KEY is not set on the server." });
  }

  let anthropicRes;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `You are a legal assistant. Find candidate contradictions between these two depositions from the same witness.

Return ONLY a valid JSON array — no prose, no markdown fences. Each item must have exactly these keys:
- "march_excerpt": the relevant exact quote from Transcript 1
- "september_excerpt": the relevant exact quote from Transcript 2
- "topic": a single lowercase word describing the subject (e.g. "alibi", "timing", "location", "identity", "vehicle")

Do NOT classify type. Do NOT assign severity or confidence. Extract only.

Transcript 1 (March 2023):
${TRANSCRIPT_MARCH}

Transcript 2 (September 2023):
${TRANSCRIPT_SEPTEMBER}`,
          },
        ],
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: "Failed to reach Anthropic: " + e.message });
  }

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    return res
      .status(502)
      .json({ error: `Anthropic API error ${anthropicRes.status}: ${body}` });
  }

  const data = await anthropicRes.json();
  const raw = data.content[0].text.replace(/```json|```/g, "").trim();
  res.json(JSON.parse(raw));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`API server running on http://localhost:${PORT}`)
);
