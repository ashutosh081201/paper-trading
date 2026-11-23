// Buy/sell execution shared by market orders (orderController) and triggered
// limit orders (limitOrderCron). Money moves with atomic, guarded updates so
// concurrent requests can't overspend funds or sell the same shares twice.
const User = require("../models/User");
const Holding = require("../models/Holding");
const Position = require("../models/Position");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const LimitOrder = require("../models/LimitOrder");
const { HttpError } = require("../helpers/httpErrors");
const { istDate } = require("../helpers/dates");
const { formatINR } = require("../helpers/format");

const INTRADAY_LEVERAGE = 5; // 5x leverage → 20% margin for intraday

const round2 = (n) => Math.round(n * 100) / 100;

// Rounded in the database so repeated trades don't accumulate float noise
const fundsUpdate = (delta) => [
  { $set: { funds: { $round: [{ $add: ["$funds", delta] }, 2] } } },
];
const PIPELINE = { returnDocument: "after", updatePipeline: true };

const debitFunds = async (userId, amount) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, funds: { $gte: amount } },
    fundsUpdate(-amount),
    PIPELINE,
  );
  if (user) return user;
  const existing = await User.findById(userId);
  if (!existing) throw new HttpError(404, "User not found");
  throw new HttpError(
    400,
    `Insufficient funds. Required: ${formatINR(amount)}, Available: ${formatINR(existing.funds)}`,
  );
};

const creditFunds = (userId, amount) =>
  User.findOneAndUpdate({ _id: userId }, fundsUpdate(amount), PIPELINE);

const formatDuration = (from, to = new Date()) => {
  const diff = Math.abs(to - new Date(from));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return days > 0 ? `${days} days ${hours} hrs` : `${hours} hrs`;
};

const record = async ({
  userId,
  symbol,
  companyName,
  orderType,
  side,
  quantity,
  price,
  buyPrice,
  profitLoss,
  holdingDuration,
  fundsAfter,
}) => {
  const totalAmount = round2(price * quantity);
  await Order.create({
    userId,
    symbol,
    companyName,
    orderType,
    transactionType: side,
    quantity,
    price,
    totalAmount,
  });
  await Transaction.create({
    userId,
    symbol,
    companyName,
    orderType,
    transactionType: side,
    quantity,
    buyPrice,
    sellPrice: side === "sell" ? price : null,
    totalAmount,
    profitLoss,
    holdingDuration,
    fundsAfter,
  });
};

// A stop loss / target is tied to the shares it was placed on. Once those
// shares are sold (by hand or by the paired order), it must not wait around
// and sell shares bought later — the same as a broker cancelling the other
// leg. The order currently executing is marked EXECUTED by its caller.
const cancelUncoveredSellOrders = ({ userId, symbol, orderType, remaining }) =>
  LimitOrder.updateMany(
    {
      userId,
      symbol,
      orderType,
      transactionType: "sell",
      status: "PENDING",
      quantity: { $gt: remaining },
    },
    { status: "CANCELLED" },
  );

// BUY at `price`. Delivery debits the full amount; intraday debits 20% margin.
const executeBuy = async ({
  userId,
  symbol,
  companyName,
  quantity,
  orderType,
  price,
}) => {
  const amount = round2(
    orderType === "intraday"
      ? (price * quantity) / INTRADAY_LEVERAGE
      : price * quantity,
  );
  const user = await debitFunds(userId, amount);

  try {
    if (orderType === "delivery") {
      const existing = await Holding.findOne({ userId, symbol });
      if (existing) {
        const totalQty = existing.quantity + quantity;
        existing.avgBuyPrice = round2(
          (existing.avgBuyPrice * existing.quantity + price * quantity) /
            totalQty,
        );
        existing.quantity = totalQty;
        await existing.save();
      } else {
        await Holding.create({
          userId,
          symbol,
          companyName,
          quantity,
          avgBuyPrice: price,
          buyDate: new Date(),
        });
      }
    } else {
      const today = istDate();
      const existing = await Position.findOne({
        userId,
        symbol,
        date: today,
        isSquaredOff: false,
      });
      if (existing) {
        const totalQty = existing.quantity + quantity;
        existing.buyPrice = round2(
          (existing.buyPrice * existing.quantity + price * quantity) / totalQty,
        );
        existing.quantity = totalQty;
        await existing.save();
      } else {
        await Position.create({
          userId,
          symbol,
          companyName,
          quantity,
          buyPrice: price,
          isSquaredOff: false,
          date: today,
        });
      }
    }
  } catch (error) {
    await creditFunds(userId, amount); // don't keep money for shares we didn't record
    throw error;
  }

  await record({
    userId,
    symbol,
    companyName,
    orderType,
    side: "buy",
    quantity,
    price,
    buyPrice: price,
    profitLoss: null,
    holdingDuration: null,
    fundsAfter: user.funds,
  });

  return { amount, funds: user.funds };
};

// SELL at `price`. `positionFilter` lets square-off target a specific
// (possibly older) intraday position instead of today's.
const executeSell = async ({
  userId,
  symbol,
  companyName,
  quantity,
  orderType,
  price,
  positionFilter,
  holdingDuration: durationLabel,
}) => {
  let buyPrice;
  let holdingDuration;
  let proceeds;
  let remaining;

  if (orderType === "delivery") {
    const holding = await Holding.findOneAndUpdate(
      { userId, symbol, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { returnDocument: "before" },
    );
    if (!holding) {
      const owned = await Holding.findOne({ userId, symbol });
      throw new HttpError(
        400,
        owned
          ? `Insufficient shares. You own ${owned.quantity} shares.`
          : "You do not own this stock",
      );
    }
    if (holding.quantity === quantity) {
      await Holding.deleteOne({ _id: holding._id, quantity: 0 });
    }
    remaining = holding.quantity - quantity;
    buyPrice = holding.avgBuyPrice;
    holdingDuration = formatDuration(holding.buyDate);
    proceeds = price * quantity;
  } else {
    const filter = positionFilter || {
      userId,
      symbol,
      date: istDate(),
      isSquaredOff: false,
    };
    const position = await Position.findOneAndUpdate(
      { ...filter, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { returnDocument: "before" },
    );
    if (!position) {
      const open = await Position.findOne(filter);
      throw new HttpError(
        400,
        open
          ? `Insufficient shares. You have ${open.quantity} shares in intraday.`
          : "No open intraday position found for this stock today",
      );
    }
    if (position.quantity === quantity) {
      // Keep the traded quantity on the closed position for history
      await Position.updateOne(
        { _id: position._id },
        { isSquaredOff: true, quantity: position.quantity },
      );
    }
    remaining = position.quantity - quantity;
    buyPrice = position.buyPrice;
    holdingDuration = durationLabel || "Intraday";
    // Margin comes back plus (or minus) the P&L on the full exposure
    proceeds =
      (buyPrice * quantity) / INTRADAY_LEVERAGE + (price - buyPrice) * quantity;
  }

  const profitLoss = round2((price - buyPrice) * quantity);
  const user = await creditFunds(userId, round2(proceeds));
  await cancelUncoveredSellOrders({ userId, symbol, orderType, remaining });

  await record({
    userId,
    symbol,
    companyName,
    orderType,
    side: "sell",
    quantity,
    price,
    buyPrice,
    profitLoss,
    holdingDuration,
    fundsAfter: user.funds,
  });

  return { profitLoss, funds: user.funds };
};

// Intraday positions must not outlive their trading day. Closes positions
// from earlier IST days (e.g. if the server was asleep at 15:20) — or all
// open positions when `includeToday` is set by the 15:20 square-off job.
const squareOffPositions = async ({
  userId,
  includeToday = false,
  getPrice,
}) => {
  const today = istDate();
  const filter = {
    isSquaredOff: false,
    date: includeToday ? { $lte: today } : { $lt: today },
  };
  if (userId) filter.userId = userId;

  const positions = await Position.find(filter);
  for (const position of positions) {
    let price = position.buyPrice; // no price → close flat rather than lose the margin
    try {
      price = await getPrice(position.symbol);
    } catch (_) {
      // keep buyPrice
    }
    try {
      await executeSell({
        userId: position.userId,
        symbol: position.symbol,
        companyName: position.companyName,
        quantity: position.quantity,
        orderType: "intraday",
        price,
        positionFilter: { _id: position._id, isSquaredOff: false },
        holdingDuration: "Intraday (auto square-off)",
      });
    } catch (error) {
      console.error(
        `Square-off failed for position ${position._id}:`,
        error.message,
      );
    }
  }
  return positions.length;
};

module.exports = {
  INTRADAY_LEVERAGE,
  executeBuy,
  executeSell,
  squareOffPositions,
};
