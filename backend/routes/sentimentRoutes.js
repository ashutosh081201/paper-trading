const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { getStockSentiment } = require("../controllers/sentimentController");

router.get("/:symbol", verifyToken, getStockSentiment);

module.exports = router;
