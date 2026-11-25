const assert = require("node:assert/strict");
const { test } = require("node:test");
const handler = require("./ai.js");
const statusHandler = require("./ai-status.js");

function makeResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function makeRequest(overrides = {}) {
  return {
    method: "POST",
    headers: { origin: "https://mind-work.vercel.app", host: "mind-work.vercel.app" },
    body: { prompt: "Explain this idea.", max_tokens: 1200 },
    ...overrides,
  };
}

test("rejects cross-origin requests", async () => {
  const response = makeResponse();
  await handler(makeRequest({
    headers: { origin: "https://attacker.example", host: "mind-work.vercel.app" },
  }), response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error, "not_same_origin");
});

test("reports a missing server key without forwarding a request", async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const response = makeResponse();
  try {
    await handler(makeRequest(), response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error, "no_key");
  } finally {
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
  }
});

test("reports whether the server-side AI key is configured", () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const response = makeResponse();
  try {
    statusHandler({}, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.available, false);
    assert.equal(response.headers["Cache-Control"], "no-store");

    process.env.ANTHROPIC_API_KEY = "test-key";
    const enabledResponse = makeResponse();
    statusHandler({}, enabledResponse);
    assert.equal(enabledResponse.body.available, true);
  } finally {
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
  }
});

test("forwards valid prompts with a capped token limit", async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const previousFetch = global.fetch;
  process.env.ANTHROPIC_API_KEY = "test-key";
  let requestBody;
  let requestHeaders;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    requestHeaders = options.headers;
    return {
      ok: true,
      json: async () => ({ model: "test-model", content: [{ type: "text", text: "A useful answer." }] }),
    };
  };

  const response = makeResponse();
  try {
    await handler(makeRequest({ body: { prompt: "Explain this idea.", max_tokens: 9000 } }), response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.text, "A useful answer.");
    assert.equal(requestHeaders["x-api-key"], "test-key");
    assert.equal(requestBody.max_tokens, 2000);
  } finally {
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
    global.fetch = previousFetch;
  }
});
