// Process entry point: loads .env, connects to MongoDB, then starts the
// HTTP server, Socket.io, market data and cron jobs.
require("dotenv").config();

const { createServer } = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const { startPriceAlertCron } = require("./services/priceAlertCron");
const { startLimitOrderCron } = require("./services/limitOrderCron");
const { startSquareOffCron } = require("./services/squareOffCron");
const { initSocket } = require("./services/socketService");
const marketData = require("./marketData");

const httpServer = createServer(app); // ← HTTP server wraps Express

mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("MongoDB connected successfully");

    try {
      await mongoose.connection.collection("watchlists").dropIndex("userId_1");
      console.log("✅ Watchlist index migrated");
    } catch (_) {}

    // ← httpServer instead of app.listen
    httpServer.listen(process.env.PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${process.env.PORT}`);
      marketData.init();
      initSocket(httpServer); // ← Initialize socket.io
      startPriceAlertCron();
      startLimitOrderCron();
      startSquareOffCron();
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed:", err.message);
  });
