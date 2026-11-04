const User = require("../models/User");
const Holding = require("../models/Holding");
const Position = require("../models/Position");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const LimitOrder = require("../models/LimitOrder");
const Watchlist = require("../models/Watchlist");
const Note = require("../models/Note");
const PriceAlert = require("../models/PriceAlert");
const OTP = require("../models/OTP");
const { istDate } = require("../helpers/dates");
const { sendError } = require("../helpers/httpErrors");
const { requirePositiveNumber } = require("../helpers/validate");

const STARTING_FUNDS = 100000;
const MAX_TOP_UP = 10_000_000; // ₹1 crore per top-up

// Trading data that "reset" wipes and "delete" removes along with the user
const clearTradingData = (userId) =>
  Promise.all([
    Holding.deleteMany({ userId }),
    Position.deleteMany({ userId }),
    Order.deleteMany({ userId }),
    Transaction.deleteMany({ userId }),
    LimitOrder.deleteMany({ userId }),
  ]);

// ADD FUNDS
const addFunds = async (req, res) => {
  try {
    if (req.body.amount === undefined || req.body.amount === null) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    const amount = requirePositiveNumber(req.body.amount, "Amount", { max: MAX_TOP_UP });
    const user = await User.findOneAndUpdate(
      { _id: req.userId },
      [{ $set: { funds: { $round: [{ $add: ["$funds", amount] }, 2] } } }],
      { returnDocument: "after", updatePipeline: true },
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message: `₹${amount} added successfully`,
      funds: user.funds,
    });
  } catch (error) {
    sendError(res, error, "Adding funds");
  }
};

// RESET ACCOUNT
const resetAccount = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await clearTradingData(req.userId);
    user.funds = STARTING_FUNDS;
    await user.save();
    res.status(200).json({
      message: "Account reset successfully",
      funds: user.funds,
    });
  } catch (error) {
    sendError(res, error, "Resetting the account");
  }
};

// GET ACCOUNT SUMMARY
const getAccountSummary = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const [holdingsCount, positionsCount, ordersCount, transactionsCount] =
      await Promise.all([
        Holding.countDocuments({ userId: req.userId }),
        Position.countDocuments({
          userId: req.userId,
          date: istDate(),
          isSquaredOff: false,
        }),
        Order.countDocuments({ userId: req.userId }),
        Transaction.countDocuments({ userId: req.userId }),
      ]);
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        funds: user.funds,
        memberSince: user.createdAt,
      },
      stats: {
        holdingsCount,
        positionsCount,
        ordersCount,
        transactionsCount,
      },
    });
  } catch (error) {
    sendError(res, error, "Loading the account summary");
  }
};

// DELETE ACCOUNT — removes the user and everything they created
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await clearTradingData(req.userId);
    await Promise.all([
      Watchlist.deleteMany({ userId: req.userId }),
      Note.deleteMany({ userId: req.userId }),
      PriceAlert.deleteMany({ userId: req.userId }),
      OTP.deleteMany({ email: user.email }),
    ]);
    await User.findByIdAndDelete(req.userId);
    res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    sendError(res, error, "Deleting the account");
  }
};

module.exports = {
  addFunds,
  resetAccount,
  getAccountSummary,
  deleteAccount,
};
