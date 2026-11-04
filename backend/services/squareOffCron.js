const cron = require("node-cron");
const { getQuote } = require("../helpers/stockHelper");
const { squareOffPositions } = require("./trading");

const livePrice = async (symbol) => (await getQuote(symbol)).currentPrice;

// Brokers close intraday (MIS) positions automatically before the market
// closes; we do it at 15:20 IST on weekdays. Positions missed while the
// server was asleep are closed on startup and on the user's next request.
const squareOffAll = () => squareOffPositions({ includeToday: true, getPrice: livePrice });
const squareOffStale = () => squareOffPositions({ getPrice: livePrice });

const startSquareOffCron = () => {
  cron.schedule("20 15 * * 1-5", () => squareOffAll(), { timezone: "Asia/Kolkata" });
  squareOffStale().catch((err) => console.error("Startup square-off failed:", err.message));
  console.log("✅ Intraday auto square-off scheduled (15:20 IST, Mon–Fri)");
};

module.exports = { startSquareOffCron, squareOffAll };
