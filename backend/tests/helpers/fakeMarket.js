// Replaces ../../marketData in tests. Prices are set per test with setPrice;
// symbols without a price behave like a failed upstream lookup.
const prices = new Map();
let failAll = false;

const quoteFor = (symbol) => {
  const p = prices.get(symbol);
  if (!p) return null;
  const previousClose = p.previousClose ?? p.price;
  const change = parseFloat((p.price - previousClose).toFixed(2));
  return {
    symbol,
    companyName: null,
    currentPrice: p.price,
    previousClose,
    dayHigh: p.dayHigh ?? p.price,
    dayLow: p.dayLow ?? p.price,
    volume: 1000,
    change,
    changePercent: previousClose
      ? parseFloat(((change / previousClose) * 100).toFixed(2))
      : 0,
    weekHigh52: null,
    weekLow52: null,
    marketCapRaw: null,
    peRatio: null,
    upperCircuit: p.upperCircuit ?? null,
    lowerCircuit: p.lowerCircuit ?? null,
  };
};

const fakeMarket = {
  setPrice: (symbol, price, extra = {}) => prices.set(symbol, { price, ...extra }),
  reset: () => {
    prices.clear();
    failAll = false;
  },
  setFailAll: (value) => {
    failAll = value;
  },
  getQuote: async (symbol) => {
    if (failAll) throw new Error("Upstox: service unavailable");
    const q = quoteFor(symbol);
    if (!q) throw new Error(`No quote data for ${symbol}`);
    return q;
  },
  getQuotes: async (symbols) => {
    if (failAll) throw new Error("Upstox: service unavailable");
    const out = {};
    symbols.forEach((s) => {
      const q = quoteFor(s);
      if (q) out[s] = q;
    });
    return out;
  },
  getHistory: async () => ({
    candles: [
      { ts: 1793350000, date: "2026-11-02", open: 100, high: 110, low: 95, close: 105, volume: 10 },
      { ts: 1793436400, date: "2026-11-03", open: 105, high: 112, low: 101, close: 110, volume: 12 },
    ],
    currency: "INR",
    currentPrice: 110,
  }),
  search: async (q) => [{ symbol: "ZZTEST", companyName: `Result for ${q}`, exchange: "NSE" }],
  subscribeLive: async () => false,
  unsubscribeLive: () => {},
  isLiveFeedConnected: () => false,
  onTick: () => {},
  getStatus: async () => ({ provider: "fake", upstox: { connected: false }, liveFeed: false }),
  init: async () => {},
};

module.exports = fakeMarket;
