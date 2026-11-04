const mongoose = require("mongoose");

const limitOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    companyName: { type: String, required: true },
    orderType: { type: String, enum: ["delivery", "intraday"], required: true },
    transactionType: { type: String, enum: ["buy", "sell"], required: true },
    limitType: {
      type: String,
      enum: ["STOP_LOSS", "TARGET", "LIMIT_BUY"],
      required: true,
    },
    triggerPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "EXECUTED", "CANCELLED"],
      default: "PENDING",
    },
    executedAt: { type: Date, default: null },
    executedPrice: { type: Number, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LimitOrder", limitOrderSchema);
