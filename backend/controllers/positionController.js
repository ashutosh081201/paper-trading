const Position = require("../models/Position");
const { getQuote } = require("../helpers/stockHelper");
const { squareOffPositions, INTRADAY_LEVERAGE } = require("../services/trading");
const { istDate } = require("../helpers/dates");
const { sendError } = require("../helpers/httpErrors");

const round2 = (n) => parseFloat(n.toFixed(2));

// GET ALL INTRADAY POSITIONS WITH LIVE P&L
const getPositions = async (req, res) => {
  try {
    // Positions left open on an earlier day are closed first
    await squareOffPositions({
      userId: req.userId,
      getPrice: async (symbol) => (await getQuote(symbol)).currentPrice,
    });

    const positions = await Position.find({
      userId: req.userId,
      date: istDate(),
      isSquaredOff: false,
    });

    if (positions.length === 0) {
      return res.status(200).json({ positions: [] });
    }

    const positionsWithPnL = await Promise.all(
      positions.map(async (position) => {
        const investedAmount = round2(position.buyPrice * position.quantity);
        const marginPaid = round2(investedAmount / INTRADAY_LEVERAGE);
        let quote = null;
        try {
          quote = await getQuote(position.symbol);
        } catch (_) {
          // shown at cost with priceUnavailable rather than as a -100% loss
        }
        const currentPrice = quote ? quote.currentPrice : position.buyPrice;
        const currentValue = round2(currentPrice * position.quantity);
        const profitLoss = round2(currentValue - investedAmount);
        return {
          _id: position._id,
          symbol: position.symbol,
          companyName: position.companyName,
          quantity: position.quantity,
          buyPrice: position.buyPrice,
          currentPrice,
          investedAmount,
          currentValue,
          profitLoss,
          profitLossPercent: round2((profitLoss / investedAmount) * 100),
          marginPaid,
          date: position.date,
          dayChange: quote ? quote.change : 0,
          dayChangePercent: quote ? quote.changePercent : 0,
          priceUnavailable: !quote,
        };
      }),
    );

    const sum = (key) => positionsWithPnL.reduce((total, p) => total + p[key], 0);
    const totalInvested = sum("investedAmount");
    const totalCurrentValue = sum("currentValue");

    res.status(200).json({
      positions: positionsWithPnL,
      summary: {
        totalInvested: round2(totalInvested),
        totalCurrentValue: round2(totalCurrentValue),
        totalProfitLoss: round2(totalCurrentValue - totalInvested),
        totalMarginUsed: round2(sum("marginPaid")),
      },
    });
  } catch (error) {
    sendError(res, error, "Loading positions");
  }
};

module.exports = { getPositions };
