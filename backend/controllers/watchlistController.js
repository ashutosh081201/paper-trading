const Watchlist = require("../models/Watchlist");
const { getQuote } = require("../helpers/stockHelper");
const { sendError } = require("../helpers/httpErrors");
const { displaySymbol } = require("../helpers/format");
const { requireString, requireSymbol } = require("../helpers/validate");

const requireName = (name) =>
  requireString(name, "Watchlist name", { max: 40 });

const MAX_WATCHLIST_SIZE = 20;
const MAX_WATCHLISTS = 5;

// ── MULTI-WATCHLIST ENDPOINTS ──────────────────

const getAllWatchlists = async (req, res) => {
  try {
    let watchlists = await Watchlist.find({ userId: req.userId })
      .select("name stocks createdAt")
      .sort({ createdAt: 1 });

    if (watchlists.length === 0) {
      const defaultWL = await Watchlist.create({
        userId: req.userId,
        name: "My Watchlist",
        stocks: [],
      });
      return res.status(200).json({
        watchlists: [
          {
            _id: defaultWL._id,
            name: defaultWL.name,
            count: 0,
            symbols: [],
          },
        ],
      });
    }

    const result = watchlists.map((w) => ({
      _id: w._id,
      name: w.name,
      count: w.stocks.length,
      symbols: w.stocks.map((s) => s.symbol),
    }));

    res.status(200).json({ watchlists: result });
  } catch (error) {
    sendError(res, error, "Fetch watchlists");
  }
};

const createWatchlist = async (req, res) => {
  try {
    const name = requireName(req.body.name);

    const count = await Watchlist.countDocuments({ userId: req.userId });
    if (count >= MAX_WATCHLISTS) {
      return res.status(400).json({
        message: `Maximum ${MAX_WATCHLISTS} watchlists allowed`,
      });
    }

    const existing = await Watchlist.findOne({
      userId: req.userId,
      name,
    });
    if (existing) {
      return res.status(400).json({
        message: "A watchlist with this name already exists",
      });
    }

    const watchlist = await Watchlist.create({
      userId: req.userId,
      name,
      stocks: [],
    });

    res.status(201).json({
      message: "Watchlist created",
      watchlist: { _id: watchlist._id, name: watchlist.name, count: 0 },
    });
  } catch (error) {
    sendError(res, error, "Create watchlist");
  }
};

const deleteWatchlist = async (req, res) => {
  try {
    const { id } = req.params;

    const count = await Watchlist.countDocuments({ userId: req.userId });
    if (count <= 1) {
      return res
        .status(400)
        .json({ message: "Cannot delete your last watchlist" });
    }

    const watchlist = await Watchlist.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });
    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    res.status(200).json({ message: "Watchlist deleted" });
  } catch (error) {
    sendError(res, error, "Delete watchlist");
  }
};

const renameWatchlist = async (req, res) => {
  try {
    const { id } = req.params;
    const name = requireName(req.body.name);

    const watchlist = await Watchlist.findOne({ _id: id, userId: req.userId });
    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    const clash = await Watchlist.findOne({
      userId: req.userId,
      name,
      _id: { $ne: watchlist._id },
    });
    if (clash) {
      return res
        .status(400)
        .json({ message: "A watchlist with this name already exists" });
    }

    watchlist.name = name;
    await watchlist.save();

    res.status(200).json({ message: "Watchlist renamed" });
  } catch (error) {
    sendError(res, error, "Rename");
  }
};

const getWatchlistById = async (req, res) => {
  try {
    const { id } = req.params;

    const watchlist = await Watchlist.findOne({ _id: id, userId: req.userId });
    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    if (watchlist.stocks.length === 0) {
      return res.status(200).json({
        watchlist: [],
        count: 0,
        name: watchlist.name,
      });
    }

    const watchlistWithPrices = await Promise.all(
      watchlist.stocks.map(async (stock) => {
        try {
          const quote = await getQuote(stock.symbol);
          return {
            symbol: stock.symbol,
            companyName: quote.companyName, // ← use quote name (fixes ^NSEI)
            currentPrice: quote.currentPrice,
            change: quote.change,
            changePercent: quote.changePercent,
            dayHigh: quote.dayHigh,
            dayLow: quote.dayLow,
            volume: quote.volume,
          };
        } catch {
          return {
            symbol: stock.symbol,
            companyName: stock.companyName,
            currentPrice: 0,
            change: 0,
            changePercent: 0,
            dayHigh: 0,
            dayLow: 0,
            volume: 0,
          };
        }
      }),
    );

    res.status(200).json({
      watchlist: watchlistWithPrices,
      count: watchlistWithPrices.length,
      name: watchlist.name,
    });
  } catch (error) {
    sendError(res, error, "Fetch watchlist");
  }
};

const addToWatchlistById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.body.symbol || !req.body.companyName) {
      return res
        .status(400)
        .json({ message: "Symbol and company name required" });
    }
    const symbol = requireSymbol(req.body.symbol);
    const companyName = requireString(req.body.companyName, "Company name");

    const watchlist = await Watchlist.findOne({ _id: id, userId: req.userId });
    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    if (watchlist.stocks.length >= MAX_WATCHLIST_SIZE) {
      return res.status(400).json({
        message: `Watchlist is full. Max ${MAX_WATCHLIST_SIZE} stocks.`,
      });
    }

    const exists = watchlist.stocks.find(
      (s) => s.symbol === symbol.toUpperCase(),
    );
    if (exists) {
      return res.status(400).json({
        message: `${displaySymbol(symbol)} already in this watchlist`,
      });
    }

    watchlist.stocks.push({ symbol: symbol.toUpperCase(), companyName });
    await watchlist.save();

    res.status(200).json({
      message: `${displaySymbol(symbol)} added`,
      count: watchlist.stocks.length,
    });
  } catch (error) {
    sendError(res, error, "Add");
  }
};

const removeFromWatchlistById = async (req, res) => {
  try {
    const { id, symbol } = req.params;

    const watchlist = await Watchlist.findOne({ _id: id, userId: req.userId });
    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    const initial = watchlist.stocks.length;
    watchlist.stocks = watchlist.stocks.filter(
      (s) => s.symbol !== symbol.toUpperCase(),
    );

    if (watchlist.stocks.length === initial) {
      return res
        .status(404)
        .json({ message: `${displaySymbol(symbol)} not found` });
    }

    await watchlist.save();
    res.status(200).json({
      message: `${displaySymbol(symbol)} removed`,
      count: watchlist.stocks.length,
    });
  } catch (error) {
    sendError(res, error, "Remove");
  }
};

// ── BACKWARD COMPATIBLE (used by StockList.jsx) ──

const getWatchlist = async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({ userId: req.userId }).sort({
      createdAt: 1,
    });

    if (!watchlist || watchlist.stocks.length === 0) {
      return res.status(200).json({ watchlist: [], count: 0 });
    }

    const watchlistWithPrices = await Promise.all(
      watchlist.stocks.map(async (stock) => {
        try {
          const quote = await getQuote(stock.symbol);
          return {
            symbol: stock.symbol,
            companyName: quote.companyName, // ← use quote name (fixes ^NSEI)
            currentPrice: quote.currentPrice,
            change: quote.change,
            changePercent: quote.changePercent,
            dayHigh: quote.dayHigh,
            dayLow: quote.dayLow,
            volume: quote.volume,
          };
        } catch {
          return {
            symbol: stock.symbol,
            companyName: stock.companyName,
            currentPrice: 0,
            change: 0,
            changePercent: 0,
            dayHigh: 0,
            dayLow: 0,
            volume: 0,
          };
        }
      }),
    );

    res.status(200).json({
      watchlist: watchlistWithPrices,
      count: watchlistWithPrices.length,
    });
  } catch (error) {
    sendError(res, error, "Fetch watchlist");
  }
};

const addToWatchlist = async (req, res) => {
  try {
    if (!req.body.symbol || !req.body.companyName) {
      return res
        .status(400)
        .json({ message: "Symbol and company name required" });
    }
    const symbol = requireSymbol(req.body.symbol);
    const companyName = requireString(req.body.companyName, "Company name");

    let watchlist = await Watchlist.findOne({ userId: req.userId }).sort({
      createdAt: 1,
    });

    if (!watchlist) {
      watchlist = await Watchlist.create({
        userId: req.userId,
        name: "My Watchlist",
        stocks: [],
      });
    }

    if (watchlist.stocks.length >= MAX_WATCHLIST_SIZE) {
      return res.status(400).json({
        message: `Watchlist is full. Max ${MAX_WATCHLIST_SIZE} stocks.`,
      });
    }

    const exists = watchlist.stocks.find(
      (s) => s.symbol === symbol.toUpperCase(),
    );
    if (exists) {
      return res.status(400).json({
        message: `${displaySymbol(symbol)} is already in your watchlist`,
      });
    }

    watchlist.stocks.push({ symbol: symbol.toUpperCase(), companyName });
    await watchlist.save();

    res.status(200).json({
      message: `${displaySymbol(symbol)} added to watchlist`,
      count: watchlist.stocks.length,
    });
  } catch (error) {
    sendError(res, error, "Add");
  }
};

const removeFromWatchlist = async (req, res) => {
  try {
    const { symbol } = req.params;

    const watchlist = await Watchlist.findOne({ userId: req.userId }).sort({
      createdAt: 1,
    });
    if (!watchlist) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    const initial = watchlist.stocks.length;
    watchlist.stocks = watchlist.stocks.filter(
      (s) => s.symbol !== symbol.toUpperCase(),
    );

    if (watchlist.stocks.length === initial) {
      return res.status(404).json({
        message: `${displaySymbol(symbol)} not found in watchlist`,
      });
    }

    await watchlist.save();
    res.status(200).json({
      message: `${displaySymbol(symbol)} removed`,
      count: watchlist.stocks.length,
    });
  } catch (error) {
    sendError(res, error, "Remove");
  }
};

const checkWatchlist = async (req, res) => {
  try {
    const { symbol } = req.params;

    const watchlist = await Watchlist.findOne({ userId: req.userId }).sort({
      createdAt: 1,
    });
    if (!watchlist) {
      return res.status(200).json({ isInWatchlist: false });
    }

    const isInWatchlist = watchlist.stocks.some(
      (s) => s.symbol === symbol.toUpperCase(),
    );
    res.status(200).json({ isInWatchlist });
  } catch (error) {
    sendError(res, error, "Check watchlist");
  }
};

module.exports = {
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
};
