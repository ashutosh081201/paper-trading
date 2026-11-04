const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const {
  addFunds,
  resetAccount,
  getAccountSummary,
  deleteAccount,
} = require("../controllers/accountController");

// All routes are protected
router.get("/", verifyToken, getAccountSummary);
router.post("/add-funds", verifyToken, addFunds);
router.post("/reset", verifyToken, resetAccount);
router.delete("/delete", verifyToken, deleteAccount);

module.exports = router;
