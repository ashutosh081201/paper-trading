// Routes that depend on outside services: market data, NewsAPI, Gemini, Upstox OAuth.
jest.mock("../marketData", () => require("./helpers/fakeMarket"));
const axios = require("axios");
const request = require("supertest");
const app = require("../app");
const market = require("./helpers/fakeMarket");
const gemini = require("@google/generative-ai");
const { createUser, authed } = require("./helpers/auth");

let api;
beforeEach(async () => {
  market.reset();
  api = authed((await createUser()).token);
});
afterEach(() => jest.restoreAllMocks());

const quiet = () => jest.spyOn(console, "error").mockImplementation(() => {});

describe("stocks", () => {
  test("static list includes indices and NIFTY stocks", async () => {
    const res = await api.get("/api/stocks/list").expect(200);
    expect(res.body.stocks.length).toBeGreaterThan(250);
    expect(res.body.stocks[0]).toEqual({ symbol: "^NSEI", companyName: "NIFTY 50", sector: "Index" });
  });

  test("quote adds display name and sector", async () => {
    market.setPrice("TCS", 2500, { previousClose: 2400 });
    const res = await api.get("/api/stocks/quote/tcs").expect(200);
    expect(res.body.quote).toMatchObject({
      symbol: "TCS",
      companyName: "Tata Consultancy Services",
      sector: "IT",
      currentPrice: 2500,
      change: 100,
      changePercent: 4.17,
    });
  });

  test("index quote is labelled as an index", async () => {
    market.setPrice("^NSEI", 24000);
    const res = await api.get("/api/stocks/quote/%5ENSEI").expect(200);
    expect(res.body.quote).toMatchObject({ companyName: "NIFTY 50", sector: "Index" });
  });

  test("unknown symbol → 404/502, not 500", async () => {
    const res = await api.get("/api/stocks/quote/NOPE");
    expect([404, 502]).toContain(res.status);
  });

  test("search: local matches first, provider results merged without duplicates", async () => {
    const res = await api.get("/api/stocks/search?q=tata").expect(200);
    const symbols = res.body.results.map((r) => r.symbol);
    expect(symbols).toContain("TCS");
    expect(symbols.length).toBeLessThanOrEqual(10);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  test("search finds indices by name", async () => {
    const res = await api.get("/api/stocks/search?q=bank").expect(200);
    expect(res.body.results[0].symbol).toBe("^NSEBANK");
  });

  test("search falls back to provider-only results", async () => {
    const res = await api.get("/api/stocks/search?q=zzqq").expect(200);
    expect(res.body.results).toEqual([{ symbol: "ZZTEST", companyName: "Result for zzqq", exchange: "NSE" }]);
  });

  test("search requires q", async () => {
    await api.get("/api/stocks/search").expect(400);
  });

  test("history: daily candles use dates, intraday uses IST-shifted seconds", async () => {
    const daily = await api.get("/api/stocks/history/TCS?interval=1d&range=1mo").expect(200);
    expect(daily.body.candlestickData.map((c) => c.time)).toEqual(["2026-11-02", "2026-11-03"]);
    // line data is % change from the first close
    expect(daily.body.lineData[1].value).toBe(4.76);

    const intra = await api.get("/api/stocks/history/TCS?interval=5m&range=1d").expect(200);
    expect(intra.body.candlestickData[0].time).toBe(1793350000 + 19800);
  });

  test("history failure → 502 with the upstream message", async () => {
    jest.spyOn(market, "getHistory").mockRejectedValueOnce(new Error("Upstox: rate limited"));
    const res = await api.get("/api/stocks/history/TCS").expect(502);
    expect(res.body.message).toMatch(/rate limited/);
  });

  test("stock routes require auth", async () => {
    await request(app).get("/api/stocks/list").expect(401);
  });
});

describe("news and indices", () => {
  test("filters removed/incomplete articles", async () => {
    jest.spyOn(axios, "get").mockResolvedValueOnce({
      data: {
        articles: [
          { title: "Sensex up", url: "https://x/1", source: { name: "ET" }, publishedAt: "2026-11-04" },
          { title: "[Removed]", url: "https://x/2", source: { name: "ET" } },
          { title: null, url: "https://x/3", source: { name: "ET" } },
        ],
      },
    });
    const res = await api.get("/api/news/market").expect(200);
    expect(res.body.articles).toHaveLength(1);
    expect(res.body.articles[0]).toMatchObject({ title: "Sensex up", source: "ET" });
    expect(axios.get.mock.calls[0][1].params.apiKey).toBe("test-news-key");
  });

  test("NewsAPI failure → 502 with message", async () => {
    quiet();
    jest.spyOn(axios, "get").mockRejectedValueOnce(new Error("429 Too Many Requests"));
    const res = await api.get("/api/news/market").expect(502);
    expect(res.body.message).toMatch(/429/);
  });

  test("indices: only those with prices, with direction", async () => {
    market.setPrice("^NSEI", 24000, { previousClose: 24100 });
    market.setPrice("^BSESN", 80000, { previousClose: 79000 });
    const res = await api.get("/api/news/indices").expect(200);
    expect(res.body.indices).toEqual([
      expect.objectContaining({ symbol: "^NSEI", name: "NIFTY 50", isPositive: false, change: -100 }),
      expect.objectContaining({ symbol: "^BSESN", name: "SENSEX", isPositive: true }),
    ]);
  });

  test("indices: provider outage → 502", async () => {
    quiet();
    market.setFailAll(true);
    await api.get("/api/news/indices").expect(502);
  });
});

describe("AI sentiment (Gemini mocked)", () => {
  const reply = {
    sentiment: "Bullish", score: 72, riskLevel: "Medium", summary: "s",
    reasons: ["a", "b", "c"], recommendation: "Buy",
  };

  test("parses JSON even when wrapped in a code fence", async () => {
    gemini.setNextReply("```json\n" + JSON.stringify(reply) + "\n```");
    const res = await api.get("/api/sentiment/TCS?company=Tata%20Consultancy").expect(200);
    expect(res.body.sentiment).toEqual(reply);
    expect(gemini.calls.at(-1).prompt).toMatch(/Tata Consultancy \(TCS\)/);
  });

  test("non-JSON reply → 502", async () => {
    quiet();
    gemini.setNextReply("I can't help with that.");
    await api.get("/api/sentiment/TCS").expect(502);
  });

  test("Gemini error (quota, network) → 502 with message", async () => {
    quiet();
    gemini.setNextReply(new Error("quota exceeded"));
    const res = await api.get("/api/sentiment/TCS").expect(502);
    expect(res.body.message).toMatch(/quota exceeded/);
  });
});

describe("Upstox connect routes", () => {
  beforeEach(() => {
    process.env.UPSTOX_ADMIN_SECRET = "s3cret";
    process.env.UPSTOX_API_KEY = "key";
    process.env.UPSTOX_REDIRECT_URI = "http://localhost:3000/api/upstox/callback";
  });
  afterEach(() => {
    delete process.env.UPSTOX_ADMIN_SECRET;
    delete process.env.UPSTOX_API_KEY;
    delete process.env.UPSTOX_REDIRECT_URI;
  });

  test("login needs the admin secret", async () => {
    await request(app).get("/api/upstox/login").expect(403);
    await request(app).get("/api/upstox/login?secret=wrong").expect(403);
  });

  test("login redirects to Upstox with a random state", async () => {
    const res = await request(app).get("/api/upstox/login?secret=s3cret").expect(302);
    const url = new URL(res.headers.location);
    expect(url.origin).toBe("https://api.upstox.com");
    expect(url.searchParams.get("client_id")).toBe("key");
    expect(url.searchParams.get("state")).toMatch(/^[0-9a-f]{32}$/);
  });

  test("callback rejects an unknown state (CSRF)", async () => {
    const res = await request(app).get("/api/upstox/callback?code=abc&state=forged").expect(400);
    expect(res.text).toMatch(/failed/);
  });

  test("status never exposes the token", async () => {
    const res = await request(app).get("/api/upstox/status").expect(200);
    expect(JSON.stringify(res.body)).not.toMatch(/accessToken/);
  });
});

describe("deployment plumbing", () => {
  test("health check reports the database connection", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toEqual({ status: "ok", database: true });
  });

  test("CORS allow-list: listed origin allowed, others not", () => {
    const { corsOrigin } = require("../helpers/corsOrigin");
    process.env.CORS_ORIGINS = "https://stocklab.vercel.app/, http://localhost:5173";
    expect(corsOrigin()).toEqual(["https://stocklab.vercel.app", "http://localhost:5173"]);
    delete process.env.CORS_ORIGINS;
    expect(corsOrigin()).toBe(true);
  });

  test("with BREVO_API_KEY, OTP email goes over Brevo's HTTPS API", async () => {
    process.env.BREVO_API_KEY = "test-brevo-key";
    process.env.EMAIL_FROM = "hello@stocklab.test";
    const post = jest.spyOn(axios, "post").mockResolvedValue({ data: { messageId: "x" } });
    try {
      await request(app).post("/api/auth/signup")
        .send({ name: "<b>Eve</b>", email: "eve@example.test", password: "Secret123!" })
        .expect(201);
      const [url, body, config] = post.mock.calls[0];
      expect(url).toBe("https://api.brevo.com/v3/smtp/email");
      expect(config.headers["api-key"]).toBe("test-brevo-key");
      expect(body).toMatchObject({
        sender: { name: "StockLab", email: "hello@stocklab.test" },
        to: [{ email: "eve@example.test" }],
      });
      expect(body.htmlContent).toMatch(/\d{6}/);
    } finally {
      delete process.env.BREVO_API_KEY;
      delete process.env.EMAIL_FROM;
    }
  });

  test("Brevo failure → 502 and the user can retry", async () => {
    process.env.BREVO_API_KEY = "test-brevo-key";
    jest.spyOn(axios, "post").mockRejectedValueOnce(new Error("401 unauthorized"));
    try {
      const res = await request(app).post("/api/auth/signup")
        .send({ name: "Eve", email: "eve2@example.test", password: "Secret123!" })
        .expect(502);
      expect(res.body.message).toMatch(/Couldn't send the email/);
    } finally {
      delete process.env.BREVO_API_KEY;
    }
    await request(app).post("/api/auth/signup")
      .send({ name: "Eve", email: "eve2@example.test", password: "Secret123!" })
      .expect(201);
  });
});
