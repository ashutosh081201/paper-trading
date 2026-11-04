const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { buyStock, sellStock } = require("../controllers/orderController");

// All order routes are protected
router.post("/buy", verifyToken, buyStock);
router.post("/sell", verifyToken, sellStock);

module.exports = router;
