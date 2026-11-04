const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const validateObjectId = require("../middlewares/validateObjectId");
const {
  createAlert,
  getAlerts,
  deleteAlert,
} = require("../controllers/alertController");

router.post("/", verifyToken, createAlert);
router.get("/", verifyToken, getAlerts);
router.delete("/:id", verifyToken, deleteAlert);

router.param("id", validateObjectId);

module.exports = router;
