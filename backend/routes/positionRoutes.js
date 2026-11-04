const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { getPositions } = require("../controllers/positionController");

// Protected route
router.get("/", verifyToken, getPositions);

module.exports = router;
