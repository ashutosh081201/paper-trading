const cron = require("node-cron");
const LimitOrder = require("../models/LimitOrder");
const User = require("../models/User");
const { getQuote } = require("../helpers/stockHelper");
const { sendOrderExecuted } = require("../helpers/mailer");
const { HttpError } = require("../helpers/httpErrors");
const { executeBuy, executeSell } = require("./trading");

const executeLimitOrder = async (limitOrder, currentPrice) => {
  const { userId, symbol, companyName, orderType, transactionType, quantity, limitType } =
    limitOrder;
  let result;
  try {
    const trade = { userId, symbol, companyName, quantity, orderType, price: currentPrice };
    result =
      transactionType === "sell" ? await executeSell(trade) : await executeBuy(trade);
  } catch (error) {
    if (!(error instanceof HttpError)) {
      console.error(`Limit order execution error for ${symbol}:`, error.message);
      return; // unexpected — leave it pending and retry next minute
    }
    limitOrder.status = "CANCELLED";
    await limitOrder.save();
    return;
  }

  limitOrder.status = "EXECUTED";
  limitOrder.executedAt = new Date();
  limitOrder.executedPrice = currentPrice;
  await limitOrder.save();

  try {
    const user = await User.findById(userId);
    await sendOrderExecuted(user.email, user.name, {
      limitType,
      symbol,
      companyName,
      quantity,
      orderType,
      triggerPrice: limitOrder.triggerPrice,
      price: currentPrice,
      profitLoss: result.profitLoss ?? null,
    });
  } catch (_) {
    // the trade stands even if the email fails
  }

  console.log(
    `✅ Limit order executed: ${transactionType.toUpperCase()} ${quantity} ${symbol} @ ₹${currentPrice} (${limitType})`,
  );
};

const checkLimitOrders = async () => {
  try {
    const pendingOrders = await LimitOrder.find({ status: "PENDING" });
    if (pendingOrders.length === 0) return;

    console.log(`Checking ${pendingOrders.length} pending limit order(s)...`);

    const symbols = [...new Set(pendingOrders.map((o) => o.symbol))];

    const prices = {};
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await getQuote(symbol);
          prices[symbol] = quote.currentPrice;
        } catch (_) {}
      }),
    );

    for (const order of pendingOrders) {
      const currentPrice = prices[order.symbol];
      if (!currentPrice) continue;

      let shouldExecute = false;

      if (order.limitType === "STOP_LOSS") {
        shouldExecute = currentPrice <= order.triggerPrice;
      } else if (order.limitType === "TARGET") {
        shouldExecute = currentPrice >= order.triggerPrice;
      } else if (order.limitType === "LIMIT_BUY") {
        shouldExecute = currentPrice <= order.triggerPrice;
      }

      // A sibling order executed earlier in this run may have cancelled it
      if (shouldExecute && (await LimitOrder.exists({ _id: order._id, status: "PENDING" }))) {
        await executeLimitOrder(order, currentPrice);
      }
    }
  } catch (error) {
    console.error("Limit order cron error:", error.message);
  }
};

const startLimitOrderCron = () => {
  cron.schedule("* * * * *", () => checkLimitOrders());
  console.log("✅ Limit order cron started (every 1 minute)");
};

module.exports = { startLimitOrderCron, checkLimitOrders, executeLimitOrder };
