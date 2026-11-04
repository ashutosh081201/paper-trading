// Small input checks for request bodies. Each throws an HttpError(400).
const { HttpError } = require("./httpErrors");

const bad = (message) => new HttpError(400, message);

const requireString = (value, field, { max = 200 } = {}) => {
  if (typeof value !== "string" || !value.trim()) throw bad(`${field} is required`);
  if (value.trim().length > max) throw bad(`${field} is too long`);
  return value.trim();
};

// Whole number of shares, sent as a number or numeric string
const requireQuantity = (value) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) {
    throw bad("Quantity must be a whole number greater than 0");
  }
  if (n > 1_000_000) throw bad("Quantity is too large");
  return n;
};

const requirePositiveNumber = (value, field, { max = Infinity } = {}) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    throw bad(`${field} must be a number greater than 0`);
  }
  if (n > max) throw bad(`${field} is too large`);
  return n;
};

const requireOneOf = (value, allowed, field) => {
  if (!allowed.includes(value)) throw bad(`Invalid ${field}`);
  return value;
};

const requireSymbol = (value) => requireString(value, "Symbol", { max: 30 }).toUpperCase();

// Indices (^NSEI etc.) are view-only
const requireTradableSymbol = (value) => {
  const symbol = requireSymbol(value);
  if (symbol.startsWith("^")) throw bad("Indices can't be traded");
  return symbol;
};

module.exports = {
  requireString,
  requireQuantity,
  requirePositiveNumber,
  requireOneOf,
  requireSymbol,
  requireTradableSymbol,
};
