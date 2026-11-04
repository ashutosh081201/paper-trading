const mongoose = require("mongoose");

// Single document holding the Upstox OAuth access token used for market data
const upstoxTokenSchema = new mongoose.Schema(
  {
    accessToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    upstoxUserId: String,
    upstoxUserName: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("UpstoxToken", upstoxTokenSchema);
