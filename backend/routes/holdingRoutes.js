const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { getHoldings } = require("../controllers/holdingController");

// Protected route
router.get("/", verifyToken, getHoldings);

module.exports = router;
