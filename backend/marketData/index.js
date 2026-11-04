// Market data entry point. Uses Upstox when a token is available,
// otherwise falls back to Yahoo Finance. Force one with MARKET_DATA_PROVIDER.
const upstox = require("./upstox");
const yahoo = require("./yahoo");
const upstoxFeed = require("./upstoxFeed");
const { getTokenStatus } = require("./upstoxAuth");

const QUOTE_CACHE_MS = 3000;
const BATCH_WINDOW_MS = 20;

let lastProviderName = null;

const getProvider = async () => {
  const forced = process.env.MARKET_DATA_PROVIDER;
  let provider;
  if (forced === "yahoo") provider = yahoo;
  else if (forced === "upstox" || (await upstox.isConfigured()))
    provider = upstox;
  else provider = yahoo;

  if (provider.name !== lastProviderName) {
    console.log(`📈 Market data provider: ${provider.name}`);
    lastProviderName = provider.name;
  }
  return provider;
};

// ── Quotes (cached briefly, single-symbol calls batched) ──────────
const quoteCache = new Map(); // symbol → { quote, at }

const getQuotes = async (symbols) => {
  const results = {};
  const missing = [];
  const now = Date.now();
  [...new Set(symbols)].forEach((symbol) => {
    const cached = quoteCache.get(symbol);
    if (cached && now - cached.at < QUOTE_CACHE_MS)
      results[symbol] = cached.quote;
    else missing.push(symbol);
  });

  if (missing.length > 0) {
    const provider = await getProvider();
    const fresh = await provider.getQuotes(missing);
    Object.entries(fresh).forEach(([symbol, quote]) => {
      quoteCache.set(symbol, { quote, at: Date.now() });
      results[symbol] = quote;
    });
  }
  return results;
};

// Many controllers call getQuote() per symbol inside Promise.all —
// collect those calls for a few ms and fetch them in one request.
let pending = new Map(); // symbol → [{ resolve, reject }]
let batchTimer = null;

const flushBatch = async () => {
  const batch = pending;
  pending = new Map();
  batchTimer = null;
  try {
    const quotes = await getQuotes([...batch.keys()]);
    batch.forEach((waiters, symbol) => {
      const quote = quotes[symbol];
      waiters.forEach(({ resolve, reject }) =>
        quote
          ? resolve(quote)
          : reject(new Error(`No quote data for ${symbol}`)),
      );
    });
  } catch (error) {
    batch.forEach((waiters) => waiters.forEach(({ reject }) => reject(error)));
  }
};

const getQuote = (symbol) =>
  new Promise((resolve, reject) => {
    if (!pending.has(symbol)) pending.set(symbol, []);
    pending.get(symbol).push({ resolve, reject });
    if (!batchTimer) batchTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
  });

// ── History / search ──────────────────────────────────────────────
const getHistory = async (symbol, interval, range) =>
  (await getProvider()).getHistory(symbol, interval, range);

const search = async (query) => (await getProvider()).search(query);

// ── Live feed (Upstox only) ───────────────────────────────────────
const subscribeLive = async (symbols) => {
  if ((await getProvider()) !== upstox) return false;
  await upstoxFeed.subscribe(symbols);
  return true;
};

const unsubscribeLive = (symbols) => upstoxFeed.unsubscribe(symbols);

const isLiveFeedConnected = () => upstoxFeed.isConnected();

const getStatus = async () => ({
  provider: (await getProvider()).name,
  upstox: await getTokenStatus(),
  liveFeed: upstoxFeed.isConnected(),
});

const init = async () => {
  const provider = await getProvider();
  if (provider === upstox) {
    await require("./upstoxInstruments")
      .ensureLoaded()
      .catch(() => {});
  } else {
    console.log(
      "ℹ️  Upstox not connected — set UPSTOX_ANALYTICS_TOKEN or visit /api/upstox/login",
    );
  }
};

module.exports = {
  getQuote,
  getQuotes,
  getHistory,
  search,
  subscribeLive,
  unsubscribeLive,
  isLiveFeedConnected,
  onTick: (handler) => upstoxFeed.on("tick", handler),
  getStatus,
  init,
};
