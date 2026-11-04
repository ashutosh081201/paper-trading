// Unit tests for the market data layer with Upstox's HTTP API stubbed out.
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");

// A tiny instruments file instead of Upstox's 2,700-stock download
const cacheFile = path.join(os.tmpdir(), `stocklab-instruments-${process.pid}.json`);
const INSTRUMENTS = [
  { segment: "NSE_EQ", instrument_type: "EQ", trading_symbol: "RELIANCE", short_name: "Reliance Industries", name: "RELIANCE INDUSTRIES LTD", instrument_key: "NSE_EQ|INE002A01018" },
  { segment: "NSE_EQ", instrument_type: "EQ", trading_symbol: "TMPV", short_name: "Tata Motors PV", name: "TATA MOTORS PASS VEH LTD", instrument_key: "NSE_EQ|INE155A01022" },
  { segment: "NSE_EQ", instrument_type: "EQ", trading_symbol: "TCS", short_name: "TCS", name: "TATA CONSULTANCY SERV LT", instrument_key: "NSE_EQ|INE467B01029" },
  { segment: "NSE_EQ", instrument_type: "BE", trading_symbol: "TCS", short_name: "TCS BE", name: "TCS", instrument_key: "NSE_EQ|BE-TCS" },
];
fs.writeFileSync(cacheFile, JSON.stringify(INSTRUMENTS));
process.env.UPSTOX_INSTRUMENTS_CACHE = cacheFile;

const axios = require("axios");
const marketData = require("../marketData");
const upstox = require("../marketData/upstox");
const instruments = require("../marketData/upstoxInstruments");
const feed = require("../marketData/upstoxFeed");
const auth = require("../marketData/upstoxAuth");
const UpstoxToken = require("../models/UpstoxToken");
const { rangeToDays, istDateString } = require("../marketData/common");
const { freezeDate, unfreezeDate } = require("./helpers/clock");

// Routes stubbed Upstox requests; each test sets `routes`
let calls;
let routes;
upstox.api.defaults.adapter = async (config) => {
  const url = config.url;
  calls.push({ url, params: config.params, auth: config.headers.Authorization });
  for (const [pattern, handler] of routes) {
    if (pattern.test(url)) {
      const { status = 200, data } = await handler(config);
      if (status >= 400) {
        const err = new Error(`Request failed with status code ${status}`);
        err.response = { status, data };
        throw err;
      }
      return { status, data, headers: {}, config, statusText: "OK" };
    }
  }
  throw new Error(`Unexpected request ${url}`);
};

const quoteRow = (token, last, extra = {}) => ({
  instrument_token: token, last_price: last, ohlc: { high: last + 5, low: last - 5 },
  volume: 100, ...extra,
});

afterAll(() => fs.rmSync(cacheFile, { force: true }));
beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {}); // background refresh is blocked offline
  calls = [];
  routes = [];
  process.env.UPSTOX_ANALYTICS_TOKEN = "analytics-token";
});
afterEach(() => {
  unfreezeDate();
  jest.restoreAllMocks();
  delete process.env.MARKET_DATA_PROVIDER;
});

describe("instruments", () => {
  test("loads from the saved file and maps symbols, aliases and indices", async () => {
    await instruments.ensureLoaded();
    expect(instruments.toInstrumentKey("RELIANCE")).toBe("NSE_EQ|INE002A01018");
    expect(instruments.toInstrumentKey("TCS")).toBe("NSE_EQ|INE467B01029"); // EQ preferred over BE
    expect(instruments.toInstrumentKey("TATAMOTORS")).toBe("NSE_EQ|INE155A01022"); // alias → TMPV
    expect(instruments.toInstrumentKey("^NSEI")).toBe("NSE_INDEX|Nifty 50");
    expect(instruments.toInstrumentKey("NOPE")).toBeNull();
    expect(instruments.toSymbols("NSE_EQ|INE155A01022").sort()).toEqual(["TATAMOTORS", "TMPV"]);
  });

  test("search ranks exact symbol, then prefix, then name matches", async () => {
    await instruments.ensureLoaded();
    expect(instruments.search("tcs").map((r) => r.symbol)).toEqual(["TCS"]);
    expect(instruments.search("tata").map((r) => r.symbol)).toContain("TMPV");
    expect(instruments.search("reliance")[0]).toEqual({
      symbol: "RELIANCE", companyName: "Reliance Industries", exchange: "NSE",
    });
  });
});

test("search also matches the full company name, not just Upstox's short name", async () => {
  await instruments.ensureLoaded();
  // TCS's short_name is just "TCS", so "tata consultancy" finds nothing today.
  expect(instruments.search("tata consultancy").map((r) => r.symbol)).toEqual(["TCS"]);
});

describe("quotes", () => {
  test("maps Upstox fields, aliases and index keys; rounds previous close", async () => {
    routes.push([/market-quote\/quotes/, () => ({ data: { status: "success", data: {
      "NSE_EQ:RELIANCE": quoteRow("NSE_EQ|INE002A01018", 1410.2, {
        prev_close_price: 1400, year_high: 1600, year_low: 1100,
        upper_circuit_limit: 1540, lower_circuit_limit: 1260,
      }),
      "NSE_EQ:TMPV": quoteRow("NSE_EQ|INE155A01022", 700, { prev_close_price: 690, year_high: 800, year_low: 500 }),
      "NSE_INDEX:Nifty 50": quoteRow("NSE_INDEX|Nifty 50", 25100.1, { net_change: 50.2 }),
    } } })]);
    routes.push([/historical-candle\/NSE_INDEX/, () => ({ data: { data: { candles: [
      ["2026-06-01T00:00:00+05:30", 1, 26000, 22000, 1, 0, 0],
      ["2026-09-01T00:00:00+05:30", 1, 25500, 23000, 1, 0, 0],
    ] } } })]);

    const quotes = await upstox.getQuotes(["RELIANCE", "TATAMOTORS", "^NSEI", "UNKNOWN"]);
    expect(Object.keys(quotes).sort()).toEqual(["RELIANCE", "TATAMOTORS", "^NSEI"]);
    expect(quotes.RELIANCE).toMatchObject({
      currentPrice: 1410.2, previousClose: 1400, change: 10.2, changePercent: 0.73,
      weekHigh52: 1600, weekLow52: 1100, upperCircuit: 1540, lowerCircuit: 1260,
      companyName: "Reliance Industries",
    });
    expect(quotes.TATAMOTORS.currentPrice).toBe(700);
    // index: previous close derived from net_change; 52-week range from candles
    expect(quotes["^NSEI"]).toMatchObject({ previousClose: 25049.9, weekHigh52: 26000, weekLow52: 22000 });
    expect(calls[0].auth).toBe("Bearer analytics-token");
  });

  test("concurrent getQuote calls are batched into one request and cached briefly", async () => {
    routes.push([/market-quote\/quotes/, () => ({ data: { data: {
      "NSE_EQ:RELIANCE": quoteRow("NSE_EQ|INE002A01018", 1000, { year_high: 1, year_low: 1 }),
      "NSE_EQ:TCS": quoteRow("NSE_EQ|INE467B01029", 2000, { year_high: 1, year_low: 1 }),
    } } })]);
    const [a, b] = await Promise.all([marketData.getQuote("RELIANCE"), marketData.getQuote("TCS")]);
    expect([a.currentPrice, b.currentPrice]).toEqual([1000, 2000]);
    expect(calls).toHaveLength(1);
    expect(calls[0].params.instrument_key.split(",")).toHaveLength(2);

    await marketData.getQuote("RELIANCE"); // within 3 s → cache
    expect(calls).toHaveLength(1);
  });

  test("a symbol missing from the response rejects only that caller", async () => {
    routes.push([/market-quote\/quotes/, () => ({ data: { data: {} } })]);
    await expect(marketData.getQuote("TMPV")).rejects.toThrow(/No quote data for TMPV/);
  });

  test("401 invalidates the token and surfaces Upstox's message", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const spy = jest.spyOn(auth, "invalidateToken");
    routes.push([/market-quote/, () => ({ status: 401, data: { errors: [{ message: "Invalid token used to access API" }] } })]);
    await expect(upstox.getQuotes(["RELIANCE"])).rejects.toThrow("Upstox: Invalid token used to access API");
    expect(spy).toHaveBeenCalled();
  });

  test("429 rate limit error is passed through with Upstox's message", async () => {
    routes.push([/market-quote/, () => ({ status: 429, data: { errors: [{ message: "Too many requests" }] } })]);
    await expect(upstox.getQuotes(["TCS"])).rejects.toThrow("Upstox: Too many requests");
  });

  test("no token → requests are refused before hitting the network", async () => {
    delete process.env.UPSTOX_ANALYTICS_TOKEN;
    await expect(upstox.getQuotes(["TCS"])).rejects.toThrow("Upstox is not connected");
    expect(calls).toHaveLength(0);
  });
});

describe("provider selection", () => {
  test("falls back to Yahoo when Upstox has no token", async () => {
    delete process.env.UPSTOX_ANALYTICS_TOKEN;
    freezeDate("2030-01-01T00:00:00Z"); // past the 60s DB-lookup throttle
    const get = jest.spyOn(axios, "get").mockResolvedValue({ data: { chart: { result: [{ meta: {
      regularMarketPrice: 105, previousClose: 100, regularMarketDayHigh: 106, regularMarketDayLow: 99,
    } }] } } });
    const quotes = await marketData.getQuotes(["YAHOOONLY"]);
    expect(get.mock.calls[0][0]).toMatch(/query1\.finance\.yahoo\.com.*YAHOOONLY\.NS/);
    expect(quotes.YAHOOONLY).toMatchObject({ currentPrice: 105, changePercent: 5 });
  });

  test("MARKET_DATA_PROVIDER=yahoo forces Yahoo even with a token", async () => {
    process.env.MARKET_DATA_PROVIDER = "yahoo";
    jest.spyOn(axios, "get").mockResolvedValue({ data: { quotes: [
      { symbol: "INFY.NS", exchange: "NSI", longname: "Infosys" },
      { symbol: "AAPL", exchange: "NMS", longname: "Apple" },
    ] } });
    expect(await marketData.search("inf")).toEqual([{ symbol: "INFY", companyName: "Infosys", exchange: "NSI" }]);
  });

  test("a saved OAuth token is used when there is no analytics token; expired ones are ignored", async () => {
    delete process.env.UPSTOX_ANALYTICS_TOKEN;
    freezeDate("2031-01-01T00:00:00Z");
    await UpstoxToken.create({ accessToken: "old", expiresAt: new Date("2030-12-31T22:00:00Z") });
    expect(await auth.getAccessToken()).toBeNull();

    freezeDate("2031-01-02T00:00:00Z");
    await UpstoxToken.create({ accessToken: "fresh", expiresAt: new Date("2031-01-02T22:00:00Z") });
    expect(await auth.getAccessToken()).toBe("fresh");
    expect(await auth.getTokenStatus()).toMatchObject({ connected: true, tokenType: "oauth" });
  });
});

describe("history", () => {
  const candle = (ts, close) => [ts, close, close, close, close, 10, 0];

  test("1D with 5-minute candles keeps only the latest trading day, merged with today", async () => {
    freezeDate("2026-11-04T06:00:00Z"); // 11:30 IST Wednesday
    routes.push([/intraday/, () => ({ data: { data: { candles: [
      candle("2026-11-04T09:20:00+05:30", 5), candle("2026-11-04T09:15:00+05:30", 4),
    ] } } })]);
    routes.push([/historical-candle\//, () => ({ data: { data: { candles: [
      candle("2026-11-02T15:25:00+05:30", 1), candle("2026-11-03T15:25:00+05:30", 2),
    ] } } })]);
    const h = await upstox.getHistory("RELIANCE", "5m", "1d");
    expect(h.candles.map((c) => c.close)).toEqual([4, 5]);
    expect(h.currentPrice).toBe(5);
    const hist = calls.find((c) => !/intraday/.test(c.url));
    expect(hist.url).toBe("/v3/historical-candle/NSE_EQ%7CINE002A01018/minutes/5/2026-11-04/2026-10-27");
  });

  test("dates are IST: just after midnight IST asks for the new IST date", async () => {
    freezeDate("2026-12-31T19:00:00Z"); // 00:30 IST, 1 Jan 2027
    routes.push([/./, () => ({ data: { data: { candles: [] } } })]);
    await upstox.getHistory("TCS", "1d", "1mo");
    expect(calls[0].url).toMatch(/\/days\/1\/2027-01-01\/2026-12-01$/);
  });

  test("5Y weekly uses weeks and skips the intraday call; 1-minute ranges are capped at 30 days", async () => {
    freezeDate("2026-11-04T06:00:00Z");
    routes.push([/./, () => ({ data: { data: { candles: [] } } })]);
    await upstox.getHistory("TCS", "1wk", "5y");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/weeks\/1\/2026-11-04\/2021-11-03$/);

    calls = [];
    await upstox.getHistory("TCS", "1m", "1y");
    expect(calls[0].url).toMatch(/\/minutes\/1\/2026-11-04\/2026-10-05$/);
  });

  test("unknown symbol → error", async () => {
    await expect(upstox.getHistory("NOPE", "1d", "1mo")).rejects.toThrow(/Unknown symbol/);
  });
});

describe("index 52-week range cache", () => {
  test("fetched once per IST day, refetched the next day", async () => {
    routes.push([/market-quote/, () => ({ data: { data: {
      "NSE_INDEX:Nifty Bank": quoteRow("NSE_INDEX|Nifty Bank", 50000),
    } } })]);
    routes.push([/historical-candle/, () => ({ data: { data: { candles: [
      ["2026-06-01T00:00:00+05:30", 1, 52000, 48000, 1, 0, 0],
    ] } } })]);
    const candleCalls = () => calls.filter((c) => /historical-candle/.test(c.url)).length;

    freezeDate("2026-11-04T04:00:00Z");
    await upstox.getQuotes(["^NSEBANK"]);
    await upstox.getQuotes(["^NSEBANK"]);
    expect(candleCalls()).toBe(1);

    freezeDate("2026-11-04T18:31:00Z"); // 00:01 IST on the 5th
    const q = await upstox.getQuotes(["^NSEBANK"]);
    expect(candleCalls()).toBe(2);
    expect(q["^NSEBANK"]).toMatchObject({ weekHigh52: 52000, weekLow52: 48000 });
  });
});

describe("live feed decoding", () => {
  test("protobuf ticks become price events for every mapped symbol", async () => {
    await instruments.ensureLoaded();
    const protobuf = require("protobufjs");
    const T = protobuf
      .loadSync(path.join(__dirname, "../marketData/MarketDataFeed.proto"))
      .lookupType("com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse");
    const buf = T.encode(T.fromObject({ type: 1, feeds: {
      "NSE_EQ|INE155A01022": { fullFeed: { marketFF: {
        ltpc: { ltp: 701, cp: 690 }, vtt: 5000,
        marketOHLC: { ohlc: [{ interval: "1d", high: 710, low: 680 }] },
      } } },
      "NSE_INDEX|Nifty 50": { fullFeed: { indexFF: { ltpc: { ltp: 25000, cp: 24900 } } } },
      "NSE_EQ|UNMAPPED": { ltpc: { ltp: 1 } },
    } })).finish();

    const ticks = [];
    const onTick = (symbol, tick) => ticks.push([symbol, tick]);
    feed.on("tick", onTick);
    feed.handleMessage(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    feed.off("tick", onTick);

    expect(ticks.map(([s]) => s).sort()).toEqual(["TATAMOTORS", "TMPV", "^NSEI"]);
    expect(ticks.find(([s]) => s === "TMPV")[1]).toEqual({
      currentPrice: 701, previousClose: 690, dayHigh: 710, dayLow: 680, volume: 5000,
    });
  });

  test("garbage frames are ignored", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => feed.handleMessage(new Uint8Array([255, 255, 255]).buffer)).not.toThrow();
  });
});

describe("date helpers", () => {
  test("istDateString switches at 18:30 UTC", () => {
    expect(istDateString(new Date("2026-03-31T18:29:59Z"))).toBe("2026-03-31");
    expect(istDateString(new Date("2026-03-31T18:30:00Z"))).toBe("2026-04-01"); // quarter boundary
    expect(istDateString(new Date("2026-12-31T18:30:00Z"))).toBe("2027-01-01"); // year boundary
  });

  test("rangeToDays: fixed ranges and year-to-date", () => {
    expect(rangeToDays("5d")).toBe(5);
    expect(rangeToDays("3mo")).toBe(92);
    expect(rangeToDays("nonsense")).toBe(31);
    freezeDate("2026-01-01T10:00:00Z");
    expect(rangeToDays("ytd")).toBe(2);
    freezeDate("2026-12-31T10:00:00Z");
    expect(rangeToDays("ytd")).toBe(366);
  });

  test("istDateString isn't fooled by the server's own timezone", () => {
    // ISO maths only — no local-time calls — so it's the same in any TZ.
    expect(istDateString(new Date(Date.UTC(2026, 1, 28, 20, 0)))).toBe("2026-03-01");
  });
});
