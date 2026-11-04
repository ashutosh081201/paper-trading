const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const {
  getAllStocksController,
  getQuoteController,
  searchStockController,
  getHistoricalData,
} = require("../controllers/stockController");

// All routes are protected
router.get("/list", verifyToken, getAllStocksController);
router.get("/quote/:symbol", verifyToken, getQuoteController);
router.get("/search", verifyToken, searchStockController);
router.get("/history/:symbol", verifyToken, getHistoricalData);

module.exports = router;
