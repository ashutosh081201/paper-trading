// Yahoo Finance provider — used as a fallback when Upstox is not configured
const axios = require("axios");
const { buildQuote } = require("./common");

const HEADERS = { "User-Agent": "Mozilla/5.0" };

const toYahooSymbol = (symbol) =>
  symbol.startsWith("^") ? symbol : `${symbol}.NS`;

const toDateString = (timestamp) =>
  new Date(timestamp * 1000).toISOString().slice(0, 10);

const getQuote = async (symbol) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${toYahooSymbol(symbol)}`;
  const response = await axios.get(url, { headers: HEADERS, timeout: 8000 });
  const meta = response.data.chart.result[0].meta;

  return buildQuote({
    symbol,
    currentPrice: meta.regularMarketPrice,
    previousClose: meta.previousClose,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
    weekHigh52: meta.fiftyTwoWeekHigh || null,
    weekLow52: meta.fiftyTwoWeekLow || null,
    marketCapRaw: meta.marketCap || null,
    peRatio: meta.trailingPE ? parseFloat(meta.trailingPE.toFixed(2)) : null,
  });
};

// symbol → quote; symbols that fail are left out
const getQuotes = async (symbols) => {
  const results = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        results[symbol] = await getQuote(symbol);
      } catch (_) {}
    }),
  );
  return results;
};

const getHistory = async (symbol, interval, range) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${toYahooSymbol(symbol)}`;
  const response = await axios.get(url, {
    params: { interval, range },
    headers: HEADERS,
  });

  const result = response.data.chart.result[0];
  const timestamps = result.timestamp || [];
  const { open, high, low, close, volume } = result.indicators.quote[0];

  const candles = timestamps.map((ts, i) => ({
    ts: Math.floor(ts),
    date: toDateString(ts),
    open: open[i],
    high: high[i],
    low: low[i],
    close: close[i],
    volume: volume[i] || 0,
  }));

  return {
    candles,
    currency: result.meta.currency,
    currentPrice: result.meta.regularMarketPrice,
  };
};

const search = async (query) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&region=IN&lang=en-IN`;
  const response = await axios.get(url, { headers: HEADERS, timeout: 3000 });

  return response.data.quotes
    .filter((item) => {
      const exchange = item.exchange?.toUpperCase() || "";
      return (
        exchange === "NSE" ||
        exchange === "NSI" ||
        exchange === "BSE" ||
        exchange === "BOM" ||
        item.quoteType === "INDEX" ||
        item.symbol?.endsWith(".NS") ||
        item.symbol?.endsWith(".BO")
      );
    })
    .map((item) => ({
      symbol:
        item.quoteType === "INDEX"
          ? item.symbol
          : item.symbol
              .replace(".NS", "")
              .replace(".BO", "")
              .replace(".NSE", ""),
      companyName: item.longname || item.shortname || item.symbol,
      exchange: item.exchange,
    }));
};

module.exports = { name: "yahoo", getQuotes, getHistory, search };
