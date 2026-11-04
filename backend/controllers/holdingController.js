const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const { getQuote, NIFTY500_SYMBOLS } = require("../helpers/stockHelper");
const { sendError } = require("../helpers/httpErrors");

// GET ALL HOLDINGS WITH LIVE P&L + ANALYTICS
const getHoldings = async (req, res) => {
  try {
    const holdings = await Holding.find({ userId: req.userId });

    if (holdings.length === 0) {
      return res.status(200).json({
        holdings: [],
        summary: null,
        analytics: null,
      });
    }

    // Fetch live prices for all holdings
    const holdingsWithPnL = await Promise.all(
      holdings.map(async (holding) => {
        try {
          const quote = await getQuote(holding.symbol);
          const currentPrice = quote.currentPrice;

          const investedAmount = parseFloat(
            (holding.avgBuyPrice * holding.quantity).toFixed(2),
          );
          const currentValue = parseFloat(
            (currentPrice * holding.quantity).toFixed(2),
          );
          const profitLoss = parseFloat(
            (currentValue - investedAmount).toFixed(2),
          );
          const profitLossPercent = parseFloat(
            ((profitLoss / investedAmount) * 100).toFixed(2),
          );

          // Lookup sector from NIFTY500_SYMBOLS if quote doesn't have it
          const sector =
            quote.sector ||
            NIFTY500_SYMBOLS.find((s) => s.symbol === holding.symbol)?.sector ||
            "Others";

          return {
            _id: holding._id,
            symbol: holding.symbol,
            companyName: holding.companyName,
            quantity: holding.quantity,
            avgBuyPrice: holding.avgBuyPrice,
            currentPrice,
            investedAmount,
            currentValue,
            profitLoss,
            profitLossPercent,
            buyDate: holding.buyDate,
            dayChange: quote.change,
            dayChangePercent: quote.changePercent,
            sector, // ← ADDED
          };
        } catch (error) {
          // No live price: show the holding at cost (flagged) instead of
          // valuing it at ₹0, which would look like a 100% loss.
          const sector =
            NIFTY500_SYMBOLS.find((s) => s.symbol === holding.symbol)?.sector ||
            "Others";
          const investedAmount = parseFloat(
            (holding.avgBuyPrice * holding.quantity).toFixed(2),
          );
          return {
            _id: holding._id,
            symbol: holding.symbol,
            companyName: holding.companyName,
            quantity: holding.quantity,
            avgBuyPrice: holding.avgBuyPrice,
            currentPrice: holding.avgBuyPrice,
            investedAmount,
            currentValue: investedAmount,
            profitLoss: 0,
            profitLossPercent: 0,
            buyDate: holding.buyDate,
            dayChange: 0,
            dayChangePercent: 0,
            sector,
            priceUnavailable: true,
          };
        }
      }),
    );

    // Summary
    const totalInvested = holdingsWithPnL.reduce(
      (sum, h) => sum + h.investedAmount,
      0,
    );
    const totalCurrentValue = holdingsWithPnL.reduce(
      (sum, h) => sum + h.currentValue,
      0,
    );
    const totalProfitLoss = parseFloat(
      (totalCurrentValue - totalInvested).toFixed(2),
    );
    const totalProfitLossPercent = parseFloat(
      ((totalProfitLoss / totalInvested) * 100).toFixed(2),
    );

    // Analytics
    const sortedByPnL = [...holdingsWithPnL].sort(
      (a, b) => b.profitLossPercent - a.profitLossPercent,
    );
    const bestHolding = sortedByPnL[0] || null;
    const worstHolding = sortedByPnL[sortedByPnL.length - 1] || null;

    // All sell transactions with P&L
    const sellTransactions = await Transaction.find({
      userId: req.userId,
      transactionType: "sell",
      profitLoss: { $ne: null },
    });

    const totalSells = sellTransactions.length;
    const profitableSells = sellTransactions.filter(
      (t) => t.profitLoss > 0,
    ).length;
    const breakevenSells = sellTransactions.filter(
      (t) => t.profitLoss === 0,
    ).length;
    const lossSells = sellTransactions.filter((t) => t.profitLoss < 0).length;

    const winRate =
      totalSells > 0
        ? parseFloat(((profitableSells / totalSells) * 100).toFixed(1))
        : 0;

    // Most traded stock
    const allTransactions = await Transaction.find({ userId: req.userId });
    const tradeCounts = {};
    allTransactions.forEach((t) => {
      tradeCounts[t.symbol] = (tradeCounts[t.symbol] || 0) + 1;
    });

    const mostTradedSymbol = Object.keys(tradeCounts).sort(
      (a, b) => tradeCounts[b] - tradeCounts[a],
    )[0];

    const mostTraded = mostTradedSymbol
      ? {
          symbol: mostTradedSymbol,
          count: tradeCounts[mostTradedSymbol],
        }
      : null;

    const completedTrades = sellTransactions.filter((t) => t.holdingDuration);
    const avgHoldingDuration =
      completedTrades.length > 0
        ? `${completedTrades.length} completed trades`
        : "No completed trades yet";

    res.status(200).json({
      holdings: holdingsWithPnL,
      summary: {
        totalInvested: parseFloat(totalInvested.toFixed(2)),
        totalCurrentValue: parseFloat(totalCurrentValue.toFixed(2)),
        totalProfitLoss,
        totalProfitLossPercent,
      },
      analytics: {
        bestHolding: bestHolding
          ? {
              symbol: bestHolding.symbol,
              companyName: bestHolding.companyName,
              profitLoss: bestHolding.profitLoss,
              profitLossPercent: bestHolding.profitLossPercent,
            }
          : null,
        worstHolding: worstHolding
          ? {
              symbol: worstHolding.symbol,
              companyName: worstHolding.companyName,
              profitLoss: worstHolding.profitLoss,
              profitLossPercent: worstHolding.profitLossPercent,
            }
          : null,
        winRate,
        totalTrades: allTransactions.length,
        totalSells,
        profitableSells,
        breakevenSells,
        lossSells,
        mostTraded,
        avgHoldingDuration,
      },
    });
  } catch (error) {
    sendError(res, error, "Loading holdings");
  }
};

module.exports = { getHoldings };
