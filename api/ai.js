const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5-5";
const MAX_PROMPT_LENGTH = 120_000;
const MAX_TOKENS = 2_000;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return res.status(403).json({ error: "not_same_origin" });
  }
  if (!host || originHost.toLowerCase() !== host.toLowerCase()) {
    return res.status(403).json({ error: "not_same_origin" });
  }

  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) {
    return res.status(503).json({ error: "no_key", message: "This server has no ANTHROPIC_API_KEY." });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "bad_request" });
  }

  const prompt = body.prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: "bad_prompt" });
  }

  const requestedTokens = body.max_tokens === undefined ? 1_200 : body.max_tokens;
  if (!Number.isInteger(requestedTokens) || requestedTokens < 1) {
    return res.status(400).json({ error: "bad_max_tokens" });
  }

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MINDWORK_MODEL || DEFAULT_MODEL,
        max_tokens: Math.min(requestedTokens, MAX_TOKENS),
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return res.status(502).json({ error: "unreachable", message: "Couldn’t reach the AI service." });
  }

  if (!upstream.ok) {
    return res.status(502).json({
      error: "upstream",
      status: upstream.status,
      message: `The AI service refused the request (status ${upstream.status}).`,
    });
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    return res.status(502).json({ error: "bad_format", message: "The AI service returned an invalid response." });
  }

  const text = Array.isArray(result.content)
    ? result.content.filter((item) => item.type === "text").map((item) => item.text).join("")
    : "";
  if (!text) {
    return res.status(502).json({ error: "bad_format", message: "The AI service returned no text." });
  }

  return res.status(200).json({ text, model: result.model || process.env.MINDWORK_MODEL || DEFAULT_MODEL });
};
