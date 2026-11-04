const mongoose = require("mongoose");

const watchlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // unique removed to support multiple watchlists per user
    },
    name: {
      type: String,
      default: "My Watchlist",
      trim: true,
    },
    stocks: [
      {
        symbol: { type: String, required: true, uppercase: true, trim: true },
        companyName: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Watchlist", watchlistSchema);
