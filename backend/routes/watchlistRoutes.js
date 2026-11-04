const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const validateObjectId = require("../middlewares/validateObjectId");
const {
  getAllWatchlists,
  createWatchlist,
  deleteWatchlist,
  renameWatchlist,
  getWatchlistById,
  addToWatchlistById,
  removeFromWatchlistById,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  checkWatchlist,
} = require("../controllers/watchlistController");

// Multi-watchlist routes
router.get("/all", verifyToken, getAllWatchlists);
router.post("/create", verifyToken, createWatchlist);
router.delete("/delete/:id", verifyToken, deleteWatchlist);
router.patch("/rename/:id", verifyToken, renameWatchlist);
router.get("/list/:id", verifyToken, getWatchlistById);
router.post("/list/:id/add", verifyToken, addToWatchlistById);
router.delete("/list/:id/remove/:symbol", verifyToken, removeFromWatchlistById);

// Backward compatible routes
router.get("/", verifyToken, getWatchlist);
router.post("/add", verifyToken, addToWatchlist);
router.delete("/remove/:symbol", verifyToken, removeFromWatchlist);
router.get("/check/:symbol", verifyToken, checkWatchlist);

router.param("id", validateObjectId);

module.exports = router;
