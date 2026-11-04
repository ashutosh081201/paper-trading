const {
  getQuote,
  getAllStocks,
  searchStock,
  NIFTY500_SYMBOLS,
} = require("../helpers/stockHelper");
const marketData = require("../marketData");
const { sendError, upstream } = require("../helpers/httpErrors");

const IST_OFFSET = 19800;
const INTRADAY_INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"];

// GET ALL STOCKS AS STATIC LIST
const getAllStocksController = async (req, res) => {
  try {
    const stocks = getAllStocks();
    res.status(200).json({ stocks });
  } catch (error) {
    sendError(res, error, "Loading stocks");
  }
};

// GET SINGLE STOCK QUOTE
const getQuoteController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ message: "Symbol is required" });
    }
    const quote = await getQuote(symbol.toUpperCase()).catch((error) => {
      throw upstream(error, `Couldn't get a quote for ${symbol.toUpperCase()}`);
    });
    res.status(200).json({ quote });
  } catch (error) {
    sendError(res, error, "Loading the quote");
  }
};

// SEARCH STOCKS — Local list first then the market data provider
const searchStockController = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const query = q.toLowerCase().trim();

    // Indian indices for comparison
    const INDICES = [
      { symbol: "^NSEI", companyName: "NIFTY 50", exchange: "NSE" },
      { symbol: "^NSEBANK", companyName: "NIFTY Bank", exchange: "NSE" },
      { symbol: "^BSESN", companyName: "BSE SENSEX", exchange: "BSE" },
      { symbol: "^CNXIT", companyName: "NIFTY IT", exchange: "NSE" },
      { symbol: "^NSMIDCP", companyName: "NIFTY Midcap", exchange: "NSE" },
    ];

    // Step 1 — Search indices
    const indexResults = INDICES.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.companyName.toLowerCase().includes(query),
    );

    // Step 2 — Search local NIFTY500 list
    const localResults = NIFTY500_SYMBOLS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.companyName.toLowerCase().includes(query),
    ).map((s) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      exchange: "NSE",
    }));

    // Step 3 — Search the market data provider (Upstox instruments / Yahoo)
    let providerResults = [];
    try {
      providerResults = await searchStock(q);
    } catch {
      providerResults = [];
    }

    // Step 4 — Merge all results
    const allLocal = [...indexResults, ...localResults];
    const localSymbols = new Set(allLocal.map((s) => s.symbol));
    const uniqueProvider = providerResults.filter(
      (s) => !localSymbols.has(s.symbol),
    );

    const merged = [...allLocal, ...uniqueProvider].slice(0, 10);

    res.status(200).json({ results: merged });
  } catch (error) {
    sendError(res, error, "Search");
  }
};

// GET HISTORICAL DATA FOR CHARTS
const getHistoricalData = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = "1d", range = "1mo" } = req.query;

    if (!symbol) {
      return res.status(400).json({ message: "Symbol is required" });
    }

    const history = await marketData
      .getHistory(symbol.toUpperCase(), interval, range)
      .catch((error) => {
        throw upstream(error, `Couldn't load chart data: ${error.message}`);
      });

    const isIntraday = INTRADAY_INTERVALS.includes(interval);

    // Intraday charts use unix seconds shifted to IST; daily+ use "YYYY-MM-DD"
    const formatTime = (candle) =>
      isIntraday ? candle.ts + IST_OFFSET : candle.date;

    const candlestickData = history.candles
      .map((c) => ({
        time: formatTime(c),
        open: parseFloat(c.open?.toFixed(2)),
        high: parseFloat(c.high?.toFixed(2)),
        low: parseFloat(c.low?.toFixed(2)),
        close: parseFloat(c.close?.toFixed(2)),
        volume: c.volume || 0,
      }))
      .filter(
        (d) =>
          d.open !== null &&
          d.high !== null &&
          d.low !== null &&
          d.close !== null &&
          !isNaN(d.open) &&
          !isNaN(d.high) &&
          !isNaN(d.low) &&
          !isNaN(d.close),
      );

    // Remove duplicates for daily+ intervals
    const seen = new Set();
    const dedupedData = isIntraday
      ? candlestickData
      : candlestickData.filter((d) => {
          if (seen.has(d.time)) return false;
          seen.add(d.time);
          return true;
        });

    const firstClose = dedupedData[0]?.close || 1;
    const lineData = dedupedData.map((d) => ({
      time: d.time,
      value: parseFloat(
        (((d.close - firstClose) / firstClose) * 100).toFixed(2),
      ),
    }));

    res.status(200).json({
      symbol: symbol.toUpperCase(),
      candlestickData: dedupedData,
      lineData,
      meta: {
        interval,
        range,
        currency: history.currency,
        currentPrice: history.currentPrice,
      },
    });
  } catch (error) {
    sendError(res, error, "Loading chart data");
  }
};

module.exports = {
  getAllStocksController,
  getQuoteController,
  searchStockController,
  getHistoricalData,
};
