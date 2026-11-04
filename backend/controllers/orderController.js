const { getQuote } = require("../helpers/stockHelper");
const { executeBuy, executeSell, squareOffPositions } = require("../services/trading");
const { sendError, upstream } = require("../helpers/httpErrors");
const {
  requireString,
  requireQuantity,
  requireOneOf,
  requireTradableSymbol,
} = require("../helpers/validate");

const ORDER_TYPES = ["delivery", "intraday"];

const parseOrder = (body) => {
  const { symbol, companyName, quantity, orderType } = body;
  if (!symbol || !companyName || !quantity || !orderType) {
    return { error: "All fields are required" };
  }
  return {
    symbol: requireTradableSymbol(symbol),
    companyName: requireString(companyName, "Company name"),
    quantity: requireQuantity(quantity),
    orderType: requireOneOf(orderType, ORDER_TYPES, "order type"),
  };
};

const livePrice = async (symbol) => {
  try {
    return (await getQuote(symbol)).currentPrice;
  } catch (error) {
    throw upstream(error, `Couldn't get a live price for ${symbol}. Please try again.`);
  }
};

const settleYesterday = (userId) =>
  squareOffPositions({ userId, getPrice: livePrice });

// BUY STOCK
const buyStock = async (req, res) => {
  try {
    const order = parseOrder(req.body);
    if (order.error) return res.status(400).json({ message: order.error });

    await settleYesterday(req.userId);
    const currentPrice = await livePrice(order.symbol);
    const { amount, funds } = await executeBuy({
      userId: req.userId,
      ...order,
      price: currentPrice,
    });

    res.status(200).json({
      message: `Successfully bought ${order.quantity} shares of ${order.symbol} at ₹${currentPrice}`,
      currentPrice,
      totalCost: parseFloat((currentPrice * order.quantity).toFixed(2)),
      amountDeducted: amount,
      remainingFunds: funds,
    });
  } catch (error) {
    sendError(res, error, "Buy order");
  }
};

// SELL STOCK
const sellStock = async (req, res) => {
  try {
    const order = parseOrder(req.body);
    if (order.error) return res.status(400).json({ message: order.error });

    await settleYesterday(req.userId);
    const currentPrice = await livePrice(order.symbol);
    const { profitLoss, funds } = await executeSell({
      userId: req.userId,
      ...order,
      price: currentPrice,
    });

    res.status(200).json({
      message: `Successfully sold ${order.quantity} shares of ${order.symbol} at ₹${currentPrice}`,
      currentPrice,
      profitLoss,
      remainingFunds: funds,
    });
  } catch (error) {
    sendError(res, error, "Sell order");
  }
};

module.exports = { buyStock, sellStock, livePrice };
