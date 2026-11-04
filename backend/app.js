// Express app: middleware and routes only. No database connection, sockets
// or cron jobs here, so tests can import it directly (see server.js).
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { corsOrigin } = require("./helpers/corsOrigin");

const app = express();

// Render and Vercel sit behind a proxy; needed for per-IP rate limiting
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: corsOrigin(), credentials: true }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/stocks", require("./routes/stockRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/holdings", require("./routes/holdingRoutes"));
app.use("/api/positions", require("./routes/positionRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/account", require("./routes/accountRoutes"));
app.use("/api/watchlist", require("./routes/watchlistRoutes"));
app.use("/api/news", require("./routes/newsRoutes"));
app.use("/api/alerts", require("./routes/alertRoutes"));
app.use("/api/sentiment", require("./routes/sentimentRoutes"));
app.use("/api/limit-orders", require("./routes/limitOrderRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/upstox", require("./routes/upstoxRoutes"));

app.get("/", (req, res) => {
  res.json({ message: "StockLab API is running" });
});

// Used by Render's health check and uptime monitors
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res
    .status(dbConnected ? 200 : 503)
    .json({ status: dbConnected ? "ok" : "degraded", database: dbConnected });
});

module.exports = app;
