// Runs before each test file: fake config only, and no outbound network.
const http = require("http");
const https = require("https");

for (const key of Object.keys(process.env)) {
  if (/^(MONGO_URL|EMAIL_|NEWS_API_KEY|GEMINI_API_KEY|UPSTOX_|MARKET_DATA_PROVIDER)/.test(key)) {
    delete process.env[key];
  }
}
process.env.NODE_ENV = "test";
process.env.TOKEN_KEY = "test-token-key";
process.env.EMAIL_USER = "noreply@stocklab.test";
process.env.NEWS_API_KEY = "test-news-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.AUTH_RATE_LIMIT_MAX = "100000"; // limiter itself is tested separately

const isLocal = (host) =>
  !host || ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);

for (const mod of [http, https]) {
  const original = mod.request;
  mod.request = function guardedRequest(...args) {
    const opts = typeof args[0] === "string" || args[0] instanceof URL
      ? new URL(args[0])
      : args[0] || {};
    const host = opts.hostname || opts.host;
    if (!isLocal(host)) {
      throw new Error(`Blocked outbound request to ${host} during tests`);
    }
    return original.apply(this, args);
  };
}
