const cron = require("node-cron");
const PriceAlert = require("../models/PriceAlert");
const Holding = require("../models/Holding");
const Watchlist = require("../models/Watchlist");
const User = require("../models/User");
const { sendPriceAlert, sendCircuitAlert } = require("../helpers/mailer");
const { getQuotes } = require("../helpers/stockHelper");
const { istDate } = require("../helpers/dates");

// In-memory set to avoid duplicate circuit alerts in same session
// Key: userId_symbol_type_date
const circuitAlertsSent = new Set();

const getTodayKey = () => istDate();

// ── Price Alert Check ────────────────────────────────────────────
const checkPriceAlerts = async () => {
  try {
    const alerts = await PriceAlert.find({ triggered: false });
    if (alerts.length === 0) return;

    console.log(`Checking ${alerts.length} price alert(s)...`);

    const symbols = [...new Set(alerts.map((a) => a.symbol))];

    const quotes = await getQuotes(symbols);
    const prices = {};
    Object.entries(quotes).forEach(([symbol, quote]) => {
      if (quote.currentPrice) prices[symbol] = quote.currentPrice;
    });

    for (const alert of alerts) {
      const currentPrice = prices[alert.symbol];
      if (!currentPrice) continue;

      let triggered = false;
      if (alert.condition === "above" && currentPrice >= alert.targetPrice) {
        triggered = true;
      } else if (
        alert.condition === "below" &&
        currentPrice <= alert.targetPrice
      ) {
        triggered = true;
      }

      if (triggered) {
        try {
          const user = await User.findById(alert.userId);
          if (user) {
            await sendPriceAlert(
              user.email,
              user.name,
              alert.symbol,
              alert.companyName,
              alert.targetPrice,
              currentPrice,
              alert.condition,
            );
            console.log(
              `Alert triggered for ${alert.symbol} — email sent to ${user.email}`,
            );
          }
        } catch (emailErr) {
          console.error("Failed to send alert email:", emailErr.message);
        }
        alert.triggered = true;
        alert.triggeredAt = new Date();
        await alert.save();
      }
    }
  } catch (error) {
    console.error("Price alert cron error:", error.message);
  }
};

// ── Circuit Breaker Check ────────────────────────────────────────
const detectCircuit = ({
  changePercent,
  currentPrice,
  dayHigh,
  dayLow,
  upperCircuit,
  lowerCircuit,
}) => {
  // Use the exchange's actual circuit limits when the provider gives them (Upstox)
  if (upperCircuit || lowerCircuit) {
    if (upperCircuit && currentPrice >= upperCircuit) return "upper";
    if (lowerCircuit && currentPrice <= lowerCircuit) return "lower";
    return null;
  }

  const absChange = Math.abs(changePercent);

  // Must be at least 4.5% move to be a circuit candidate
  if (absChange < 4.5) return null;

  if (changePercent >= 4.5 && dayHigh > 0 && currentPrice >= dayHigh * 0.999) {
    return "upper";
  }

  if (changePercent <= -4.5 && dayLow > 0 && currentPrice <= dayLow * 1.001) {
    return "lower";
  }

  return null;
};

const checkCircuitBreakers = async () => {
  try {
    const today = getTodayKey();

    // Get all users who have holdings or watchlists
    const [allHoldings, allWatchlists] = await Promise.all([
      Holding.find({}),
      Watchlist.find({}),
    ]);

    // Build map: userId → Set of symbols to check
    const userSymbols = {};

    allHoldings.forEach((h) => {
      const uid = h.userId.toString();
      if (!userSymbols[uid]) userSymbols[uid] = new Set();
      userSymbols[uid].add(h.symbol);
    });

    allWatchlists.forEach((w) => {
      const uid = w.userId.toString();
      if (!userSymbols[uid]) userSymbols[uid] = new Set();
      w.stocks.forEach((s) => userSymbols[uid].add(s.symbol));
    });

    if (Object.keys(userSymbols).length === 0) return;

    // Get unique symbols across all users
    const allSymbols = new Set();
    Object.values(userSymbols).forEach((symbols) =>
      symbols.forEach((s) => allSymbols.add(s)),
    );

    console.log(
      `Checking circuit breakers for ${allSymbols.size} symbol(s)...`,
    );

    // Fetch prices
    const stockData = await getQuotes([...allSymbols]);

    // Check each user's symbols
    for (const [userId, symbols] of Object.entries(userSymbols)) {
      for (const symbol of symbols) {
        const data = stockData[symbol];
        if (!data) continue;

        const circuitType = detectCircuit(data);

        if (!circuitType) continue;

        // Check if already sent this alert today
        const alertKey = `${userId}_${symbol}_${circuitType}_${today}`;
        if (circuitAlertsSent.has(alertKey)) continue;

        try {
          const user = await User.findById(userId);
          if (!user) continue;

          // Get company name
          const holding = allHoldings.find(
            (h) => h.userId.toString() === userId && h.symbol === symbol,
          );
          const watchlistEntry = allWatchlists
            .find((w) => w.userId.toString() === userId)
            ?.stocks?.find((s) => s.symbol === symbol);

          const companyName =
            holding?.companyName || watchlistEntry?.companyName || symbol;

          await sendCircuitAlert(
            user.email,
            user.name,
            symbol,
            companyName,
            data.currentPrice,
            data.changePercent,
            circuitType,
          );

          circuitAlertsSent.add(alertKey);

          console.log(
            `⚡ Circuit alert sent: ${symbol} (${circuitType.toUpperCase()}) to ${user.email}`,
          );
        } catch (err) {
          console.error(
            `Circuit alert email error for ${symbol}:`,
            err.message,
          );
        }
      }
    }
  } catch (error) {
    console.error("Circuit breaker cron error:", error.message);
  }
};

// ── Cron Starter ─────────────────────────────────────────────────
const startPriceAlertCron = () => {
  cron.schedule("*/5 * * * *", () =>
    Promise.all([checkPriceAlerts(), checkCircuitBreakers()]),
  );
  console.log("✅ Price alert cron job started (every 5 minutes)");
};

module.exports = {
  startPriceAlertCron,
  checkPriceAlerts,
  checkCircuitBreakers,
  detectCircuit,
};
