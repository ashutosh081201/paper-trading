// Shared helpers for market data providers

const IST_OFFSET_MS = 19800 * 1000;

const round2 = (n) => parseFloat(Number(n).toFixed(2));

// Normalized quote shape returned by every provider
const buildQuote = ({
  symbol,
  companyName = null,
  currentPrice,
  previousClose,
  dayHigh = 0,
  dayLow = 0,
  volume = 0,
  weekHigh52 = null,
  weekLow52 = null,
  marketCapRaw = null,
  peRatio = null,
  upperCircuit = null,
  lowerCircuit = null,
}) => {
  const change = previousClose ? round2(currentPrice - previousClose) : 0;
  const changePercent = previousClose
    ? round2(((currentPrice - previousClose) / previousClose) * 100)
    : 0;
  return {
    symbol,
    companyName,
    currentPrice,
    previousClose,
    dayHigh,
    dayLow,
    volume,
    change,
    changePercent,
    weekHigh52,
    weekLow52,
    marketCapRaw,
    peRatio,
    upperCircuit,
    lowerCircuit,
  };
};

// "YYYY-MM-DD" in IST for a Date
const istDateString = (date) =>
  new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

// Yahoo-style range ("5d", "1mo", "1y", ...) → number of calendar days
const RANGE_DAYS = {
  "1d": 1,
  "5d": 5,
  "1mo": 31,
  "3mo": 92,
  "6mo": 183,
  "1y": 366,
  "2y": 731,
  "5y": 1827,
  "10y": 3653,
  max: 365 * 26,
};

const rangeToDays = (range) => {
  if (range === "ytd") {
    const now = new Date();
    const jan1 = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return Math.ceil((now - jan1) / 86400000) + 1;
  }
  return RANGE_DAYS[range] || 31;
};

module.exports = { round2, buildQuote, istDateString, rangeToDays };
