const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    orderType: {
      type: String,
      enum: ["delivery", "intraday"],
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    buyPrice: {
      type: Number,
      required: true,
    },
    sellPrice: {
      type: Number,
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    profitLoss: {
      type: Number,
      default: null,
    },
    holdingDuration: {
      type: String,
      default: null,
    },
    fundsAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
