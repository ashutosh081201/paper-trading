const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const validateObjectId = require("../middlewares/validateObjectId");
const {
  createLimitOrder,
  getPendingOrders,
  getAllOrders,
  cancelOrder,
} = require("../controllers/limitOrderController");

router.post("/", verifyToken, createLimitOrder);
router.get("/pending", verifyToken, getPendingOrders);
router.get("/", verifyToken, getAllOrders);
router.delete("/:id", verifyToken, cancelOrder);

router.param("id", validateObjectId);

module.exports = router;
