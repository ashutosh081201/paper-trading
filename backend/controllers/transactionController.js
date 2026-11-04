const Transaction = require("../models/Transaction");
const { sendError } = require("../helpers/httpErrors");

// GET ALL TRANSACTIONS FOR A USER
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId }).sort({
      createdAt: -1,
    }); // Latest first

    if (transactions.length === 0) {
      return res.status(200).json({ transactions: [] });
    }

    res.status(200).json({ transactions });
  } catch (error) {
    sendError(res, error, "Loading transactions");
  }
};

module.exports = { getTransactions };
