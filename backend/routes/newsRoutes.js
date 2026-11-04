const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const {
  getMarketNews,
  getMarketIndices,
} = require("../controllers/newsController");

router.get("/market", verifyToken, getMarketNews);
router.get("/indices", verifyToken, getMarketIndices);

module.exports = router;
