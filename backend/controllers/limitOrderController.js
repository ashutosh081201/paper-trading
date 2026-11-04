const LimitOrder = require("../models/LimitOrder");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Order = require("../models/Order");
const { INTRADAY_LEVERAGE } = require("../services/trading");
const { sendError } = require("../helpers/httpErrors");
const {
  requireString,
  requireQuantity,
  requirePositiveNumber,
  requireOneOf,
  requireTradableSymbol,
} = require("../helpers/validate");

// LIMIT_BUY waits for a lower price; STOP_LOSS / TARGET sell existing shares
const SIDE_FOR_LIMIT_TYPE = { LIMIT_BUY: "buy", STOP_LOSS: "sell", TARGET: "sell" };

const createLimitOrder = async (req, res) => {
  try {
    const {
      symbol,
      companyName,
      orderType,
      transactionType,
      limitType,
      triggerPrice,
      quantity,
    } = req.body;

    if (
      !symbol ||
      !companyName ||
      !orderType ||
      !transactionType ||
      !limitType ||
      !triggerPrice ||
      !quantity
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const order = {
      symbol: requireTradableSymbol(symbol),
      companyName: requireString(companyName, "Company name"),
      orderType: requireOneOf(orderType, ["delivery", "intraday"], "order type"),
      limitType: requireOneOf(limitType, Object.keys(SIDE_FOR_LIMIT_TYPE), "limit type"),
      transactionType: requireOneOf(transactionType, ["buy", "sell"], "transaction type"),
      triggerPrice: requirePositiveNumber(triggerPrice, "Trigger price"),
      quantity: requireQuantity(quantity),
    };
    if (SIDE_FOR_LIMIT_TYPE[order.limitType] !== order.transactionType) {
      return res.status(400).json({
        message: `${order.limitType} orders must be ${SIDE_FOR_LIMIT_TYPE[order.limitType]} orders`,
      });
    }

    // For STOP_LOSS and TARGET on delivery — verify user owns the stock
    if (order.transactionType === "sell" && order.orderType === "delivery") {
      const holding = await Holding.findOne({
        userId: req.userId,
        symbol: order.symbol,
      });
      if (!holding) {
        return res
          .status(400)
          .json({ message: "You don't own this stock in holdings" });
      }
      if (holding.quantity < order.quantity) {
        return res.status(400).json({
          message: `You only own ${holding.quantity} shares`,
        });
      }
    }

    // For LIMIT_BUY — check funds at the trigger price
    if (order.limitType === "LIMIT_BUY") {
      const user = await User.findById(req.userId);
      const totalCost =
        order.orderType === "intraday"
          ? (order.triggerPrice * order.quantity) / INTRADAY_LEVERAGE
          : order.triggerPrice * order.quantity;
      if (user.funds < totalCost) {
        return res.status(400).json({
          message: `Insufficient funds. Required: ₹${totalCost.toFixed(2)}, Available: ₹${user.funds.toFixed(2)}`,
        });
      }
    }

    const limitOrder = await LimitOrder.create({ userId: req.userId, ...order });

    res.status(201).json({
      message: "Limit order placed successfully",
      limitOrder,
    });
  } catch (error) {
    sendError(res, error, "Placing the order");
  }
};

const getPendingOrders = async (req, res) => {
  try {
    const orders = await LimitOrder.find({
      userId: req.userId,
      status: "PENDING",
    }).sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (error) {
    sendError(res, error, "Loading orders");
  }
};

const getAllOrders = async (req, res) => {
  try {
    const limitOrders = await LimitOrder.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    const executedOrders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ limitOrders, executedOrders });
  } catch (error) {
    sendError(res, error, "Loading orders");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await LimitOrder.findOne({ _id: id, userId: req.userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Only pending orders can be cancelled" });
    }

    order.status = "CANCELLED";
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
    sendError(res, error, "Cancelling the order");
  }
};

module.exports = {
  createLimitOrder,
  getPendingOrders,
  getAllOrders,
  cancelOrder,
};
