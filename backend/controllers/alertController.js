const PriceAlert = require("../models/PriceAlert");
const { sendError } = require("../helpers/httpErrors");
const {
  requireString,
  requirePositiveNumber,
  requireOneOf,
  requireSymbol,
} = require("../helpers/validate");

const createAlert = async (req, res) => {
  try {
    const { symbol, companyName, targetPrice, condition } = req.body;
    const userId = req.userId;

    if (!symbol || !companyName || !targetPrice || !condition) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const alertData = {
      symbol: requireSymbol(symbol),
      companyName: requireString(companyName, "Company name"),
      targetPrice: requirePositiveNumber(targetPrice, "Target price"),
      condition: requireOneOf(condition, ["above", "below"], "condition"),
    };

    // If alert already exists for this symbol → update it
    const existing = await PriceAlert.findOne({
      userId,
      symbol: alertData.symbol,
      triggered: false,
    });

    if (existing) {
      existing.targetPrice = alertData.targetPrice;
      existing.condition = alertData.condition;
      await existing.save();
      return res
        .status(200)
        .json({ message: "Alert updated successfully", alert: existing });
    }

    const alert = await PriceAlert.create({ userId, ...alertData });
    res.status(201).json({ message: "Alert created successfully", alert });
  } catch (error) {
    sendError(res, error, "Creating the alert");
  }
};

const getAlerts = async (req, res) => {
  try {
    const alerts = await PriceAlert.find({
      userId: req.userId,
      triggered: false,
    }).sort({ createdAt: -1 });
    res.status(200).json({ alerts });
  } catch (error) {
    sendError(res, error, "Loading alerts");
  }
};

const deleteAlert = async (req, res) => {
  try {
    const alert = await PriceAlert.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    res.status(200).json({ message: "Alert deleted" });
  } catch (error) {
    sendError(res, error, "Deleting the alert");
  }
};

module.exports = { createAlert, getAlerts, deleteAlert };
