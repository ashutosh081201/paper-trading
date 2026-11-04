// Maps the app's symbols (RELIANCE, ^NSEI) to Upstox instrument keys
// using Upstox's public NSE instruments file, saved to disk and refreshed daily.
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const zlib = require("zlib");

const NSE_INSTRUMENTS_URL =
  "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const CACHE_FILE =
  process.env.UPSTOX_INSTRUMENTS_CACHE ||
  path.join(__dirname, ".cache", "nse-instruments.json");
const REFRESH_MS = 24 * 60 * 60 * 1000;
const DOWNLOAD_DEADLINE_MS = 5 * 60 * 1000; // give up on a stalled download

// App index symbols (Yahoo style, stored in users' data) → Upstox keys
const INDEX_KEYS = {
  "^NSEI": "NSE_INDEX|Nifty 50",
  "^BSESN": "BSE_INDEX|SENSEX",
  "^NSEBANK": "NSE_INDEX|Nifty Bank",
  "^CNXIT": "NSE_INDEX|Nifty IT",
  "^NSMIDCP": "NSE_INDEX|NIFTY MIDCAP 100",
  "^NSEMDCP50": "NSE_INDEX|Nifty Midcap 50",
  "^CNXSMCAP": "NSE_INDEX|NIFTY SMLCAP 100",
  "^CNXAUTO": "NSE_INDEX|Nifty Auto",
  "^CNXPHARMA": "NSE_INDEX|Nifty Pharma",
  "^CNXFMCG": "NSE_INDEX|Nifty FMCG",
  "^CNXMETAL": "NSE_INDEX|Nifty Metal",
  "^CNXREALTY": "NSE_INDEX|Nifty Realty",
  "^CNXENERGY": "NSE_INDEX|Nifty Energy",
  "^CNXFINANCE": "NSE_INDEX|Nifty Fin Service",
  "^CNXPSUBANK": "NSE_INDEX|Nifty PSU Bank",
  "^CNXINFRA": "NSE_INDEX|Nifty Infra",
};

// Old symbols used in the app's stock list → current NSE trading symbols
const SYMBOL_ALIASES = {
  TATAMOTORS: "TMPV",
  ICICIPRULI: "ICICILIFE",
  GMRINFRA: "GMRAIRPORT",
  LTIM: "LTM",
  NALCO: "NATIONALUM",
  BANKOFMAHA: "MAHABANK",
  ZENSAR: "ZENSARTECH",
  ASTER: "ASTERDM",
  MINDAIND: "UNOMINDA",
};

let bySymbol = new Map(); // "RELIANCE" → instrument
let byKey = new Map(); // "NSE_EQ|INE002A01018" → [app symbols]
let equities = []; // NSE_EQ "EQ" series, for search
let loadedAt = 0;
let refreshing = null;

const applyInstruments = (items) => {
  const nextBySymbol = new Map();
  const nextByKey = new Map();
  for (const item of items) {
    if (item.segment !== "NSE_EQ") continue;
    // Prefer the regular EQ series when a symbol appears more than once
    const existing = nextBySymbol.get(item.trading_symbol);
    if (existing && existing.instrument_type === "EQ") continue;
    nextBySymbol.set(item.trading_symbol, item);
  }
  Object.entries(SYMBOL_ALIASES).forEach(([oldSymbol, newSymbol]) => {
    const item = nextBySymbol.get(newSymbol);
    if (item && !nextBySymbol.has(oldSymbol)) nextBySymbol.set(oldSymbol, item);
  });

  const addKey = (key, symbol) => {
    if (!nextByKey.has(key)) nextByKey.set(key, []);
    nextByKey.get(key).push(symbol);
  };
  nextBySymbol.forEach((item, symbol) => addKey(item.instrument_key, symbol));
  Object.entries(INDEX_KEYS).forEach(([symbol, key]) => addKey(key, symbol));

  bySymbol = nextBySymbol;
  byKey = nextByKey;
  equities = [...nextBySymbol.entries()]
    .filter(
      ([symbol, i]) =>
        i.instrument_type === "EQ" && symbol === i.trading_symbol,
    )
    .map(([, i]) => i);
};

// Saved copy so startup doesn't wait on Upstox's (sometimes slow) download
const loadFromDisk = () => {
  try {
    const items = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    applyInstruments(items);
    loadedAt = fs.statSync(CACHE_FILE).mtimeMs;
    console.log(
      `✅ Upstox instruments loaded from disk (${equities.length} NSE equities)`,
    );
    return true;
  } catch (_) {
    return false;
  }
};

const download = async () => {
  const response = await axios.get(NSE_INSTRUMENTS_URL, {
    responseType: "arraybuffer",
    timeout: 30000,
    signal: AbortSignal.timeout(DOWNLOAD_DEADLINE_MS),
  });
  const items = JSON.parse(
    zlib.gunzipSync(Buffer.from(response.data)).toString(),
  ).filter((item) => item.segment === "NSE_EQ");

  applyInstruments(items);
  loadedAt = Date.now();
  console.log(
    `✅ Upstox instruments downloaded (${equities.length} NSE equities)`,
  );

  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save Upstox instruments:", err.message);
  }
};

const refresh = () => {
  if (!refreshing) {
    refreshing = download()
      .catch((err) => {
        console.error("Failed to download Upstox instruments:", err.message);
        if (!loadedAt) throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

const ensureLoaded = async () => {
  if (!loadedAt) loadFromDisk();
  if (loadedAt && Date.now() - loadedAt < REFRESH_MS) return;
  // With a saved list, refresh in the background; only wait on first-ever run
  if (loadedAt) refresh();
  else await refresh();
};

const toInstrumentKey = (symbol) =>
  INDEX_KEYS[symbol] || bySymbol.get(symbol)?.instrument_key || null;

// An instrument can map to several app symbols (e.g. TATAMOTORS and TMPV)
const toSymbols = (instrumentKey) => byKey.get(instrumentKey) || [];

const getInstrument = (symbol) => bySymbol.get(symbol) || null;

const search = (query, limit = 10) => {
  const q = query.toLowerCase();
  const scored = [];
  for (const item of equities) {
    const symbol = item.trading_symbol.toLowerCase();
    // Upstox's short_name can be just the ticker ("TCS"), so check both names
    const names = [item.short_name, item.name]
      .filter(Boolean)
      .map((n) => n.toLowerCase());
    let score = -1;
    if (symbol === q) score = 0;
    else if (symbol.startsWith(q)) score = 1;
    else if (names.some((n) => n.startsWith(q))) score = 2;
    else if (symbol.includes(q) || names.some((n) => n.includes(q))) score = 3;
    if (score >= 0) scored.push({ score, item });
  }
  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.item.trading_symbol.localeCompare(b.item.trading_symbol),
    )
    .slice(0, limit)
    .map(({ item }) => ({
      symbol: item.trading_symbol,
      companyName: item.short_name || item.name,
      exchange: "NSE",
    }));
};

module.exports = {
  ensureLoaded,
  toInstrumentKey,
  toSymbols,
  getInstrument,
  search,
};
