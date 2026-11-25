const DEFAULT_MODEL = "claude-sonnet-5-5";

module.exports = function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    available: Boolean(process.env.ANTHROPIC_API_KEY),
    provider: "Anthropic API via Vercel",
    model: process.env.MINDWORK_MODEL || DEFAULT_MODEL,
  });
};
