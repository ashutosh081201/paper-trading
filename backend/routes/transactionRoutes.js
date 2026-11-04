const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { getTransactions } = require("../controllers/transactionController");

// Protected route
router.get("/", verifyToken, getTransactions);

module.exports = router;
