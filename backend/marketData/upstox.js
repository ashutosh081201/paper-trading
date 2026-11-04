// Upstox provider — quotes and candles via the Upstox REST API
const axios = require("axios");
const auth = require("./upstoxAuth");
const instruments = require("./upstoxInstruments");
const { round2, buildQuote, istDateString, rangeToDays } = require("./common");

const MAX_KEYS_PER_REQUEST = 500;

const api = axios.create({ baseURL: auth.API_BASE, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Upstox is not connected");
  config.headers.Authorization = `Bearer ${token}`;
  config.headers.Accept = "application/json";
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401) {
    auth.invalidateToken();
    console.error("Upstox rejected the access token (401) — reconnect Upstox");
  }
  const upstoxMessage = error.response?.data?.errors?.[0]?.message;
  if (upstoxMessage) error.message = `Upstox: ${upstoxMessage}`;
  return Promise.reject(error);
});

const isConfigured = async () => Boolean(await auth.getAccessToken());

// ── 52-week range for instruments the quote API doesn't cover (indices) ──
// Computed from the last year of daily candles, cached once per IST day.
const yearRangeCache = new Map(); // instrumentKey → { day, high, low } | { day, promise }

const getYearRange = async (key) => {
  const today = istDateString(new Date());
  const cached = yearRangeCache.get(key);
  if (cached && cached.day === today) return cached.promise || cached;

  const fromDate = istDateString(new Date(Date.now() - 365 * 86400000));
  const promise = api
    .get(
      `/v3/historical-candle/${encodeURIComponent(key)}/days/1/${today}/${fromDate}`,
    )
    .then((res) => {
      const candles = res.data?.data?.candles || [];
      if (candles.length === 0) throw new Error("No candles");
      const range = {
        day: today,
        high: Math.max(...candles.map((c) => c[2])),
        low: Math.min(...candles.map((c) => c[3])),
      };
      yearRangeCache.set(key, range);
      return range;
    })
    .catch((err) => {
      yearRangeCache.delete(key); // retry on the next quote
      console.error(`52-week range failed for ${key}:`, err.message);
      return null;
    });

  yearRangeCache.set(key, { day: today, promise });
  return promise;
};

// symbol → quote; symbols Upstox doesn't know are left out
const getQuotes = async (symbols) => {
  await instruments.ensureLoaded();

  const keyToSymbols = new Map(); // two app symbols can share an instrument
  for (const symbol of symbols) {
    const key = instruments.toInstrumentKey(symbol);
    if (!key) continue;
    if (!keyToSymbols.has(key)) keyToSymbols.set(key, []);
    keyToSymbols.get(key).push(symbol);
  }
  const keys = [...keyToSymbols.keys()];
  const results = {};
  const missingYearRange = [];

  for (let i = 0; i < keys.length; i += MAX_KEYS_PER_REQUEST) {
    const chunk = keys.slice(i, i + MAX_KEYS_PER_REQUEST);
    const response = await api.get("/v3/market-quote/quotes", {
      params: { instrument_key: chunk.join(",") },
    });

    // Response keys look like "NSE_EQ:RELIANCE"; instrument_token holds the request key
    Object.entries(response.data.data || {}).forEach(([responseKey, q]) => {
      const key = keyToSymbols.has(q.instrument_token)
        ? q.instrument_token
        : responseKey.replace(":", "|");
      const matched = keyToSymbols.get(key);
      if (!matched || !q.last_price) return;

      const previousClose = round2(
        q.prev_close_price ??
          (q.net_change != null ? q.last_price - q.net_change : q.ohlc?.close),
      );

      if (!q.year_high || !q.year_low) missingYearRange.push(key);

      matched.forEach((symbol) => {
        results[symbol] = buildQuote({
          symbol,
          companyName: instruments.getInstrument(symbol)?.short_name || null,
          currentPrice: q.last_price,
          previousClose,
          dayHigh: q.ohlc?.high,
          dayLow: q.ohlc?.low,
          volume: q.volume,
          weekHigh52: q.year_high || null,
          weekLow52: q.year_low || null,
          upperCircuit: q.upper_circuit_limit || null,
          lowerCircuit: q.lower_circuit_limit || null,
        });
      });
    });
  }

  // Fill 52-week high/low from daily candles, including today's range
  await Promise.all(
    missingYearRange.map(async (key) => {
      const range = await getYearRange(key);
      if (!range) return;
      (keyToSymbols.get(key) || []).forEach((symbol) => {
        const quote = results[symbol];
        if (!quote) return;
        quote.weekHigh52 = Math.max(range.high, quote.dayHigh || 0);
        quote.weekLow52 = quote.dayLow
          ? Math.min(range.low, quote.dayLow)
          : range.low;
      });
    }),
  );

  return results;
};

// Yahoo-style interval → Upstox unit/interval
const parseInterval = (interval) => {
  const match = /^(\d+)(m|h|d|wk|mo)$/.exec(interval);
  if (!match) return { unit: "days", value: 1 };
  const n = Number(match[1]);
  switch (match[2]) {
    case "m":
      return { unit: "minutes", value: n };
    case "h":
      return { unit: "hours", value: n };
    case "wk":
      return { unit: "weeks", value: 1 };
    case "mo":
      return { unit: "months", value: 1 };
    default:
      return { unit: "days", value: 1 };
  }
};

// Max date span Upstox allows per request
const maxSpanDays = (unit, value) => {
  if (unit === "minutes") return value <= 15 ? 30 : 90;
  if (unit === "hours") return 90;
  if (unit === "days") return 3650;
  return Infinity;
};

const toCandle = ([timestamp, open, high, low, close, volume]) => ({
  ts: Math.floor(Date.parse(timestamp) / 1000),
  date: timestamp.slice(0, 10), // already in IST (+05:30)
  open,
  high,
  low,
  close,
  volume: volume || 0,
});

const getHistory = async (symbol, interval, range) => {
  await instruments.ensureLoaded();
  const key = instruments.toInstrumentKey(symbol);
  if (!key) throw new Error(`Unknown symbol ${symbol}`);
  const encodedKey = encodeURIComponent(key);

  const { unit, value } = parseInterval(interval);
  const isIntraday = unit === "minutes" || unit === "hours";
  const rangeDays = rangeToDays(range);

  // For short intraday ranges ("1d", "5d") fetch extra calendar days to cover
  // weekends/holidays, then keep only the last N trading days.
  const tradingDaysWanted = isIntraday && rangeDays <= 5 ? rangeDays : null;
  const spanDays = Math.min(
    tradingDaysWanted ? rangeDays * 2 + 6 : rangeDays,
    maxSpanDays(unit, value),
  );

  const now = new Date();
  const toDate = istDateString(now);
  const fromDate = istDateString(new Date(now.getTime() - spanDays * 86400000));

  const requests = [
    api.get(
      `/v3/historical-candle/${encodedKey}/${unit}/${value}/${toDate}/${fromDate}`,
    ),
  ];
  // Today's candles come from the intraday endpoint
  if (unit !== "weeks" && unit !== "months") {
    requests.push(
      api
        .get(`/v3/historical-candle/intraday/${encodedKey}/${unit}/${value}`)
        .catch(() => null),
    );
  }

  const responses = await Promise.all(requests);
  const byTs = new Map();
  responses.forEach((res) => {
    (res?.data?.data?.candles || []).forEach((raw) => {
      const candle = toCandle(raw);
      byTs.set(candle.ts, candle);
    });
  });

  let candles = [...byTs.values()].sort((a, b) => a.ts - b.ts);

  if (tradingDaysWanted) {
    const dates = [...new Set(candles.map((c) => c.date))].slice(
      -tradingDaysWanted,
    );
    const keep = new Set(dates);
    candles = candles.filter((c) => keep.has(c.date));
  }

  return {
    candles,
    currency: "INR",
    currentPrice: candles[candles.length - 1]?.close ?? null,
  };
};

const search = async (query) => {
  await instruments.ensureLoaded();
  return instruments.search(query);
};

module.exports = {
  name: "upstox",
  api,
  isConfigured,
  getQuotes,
  getHistory,
  search,
};
