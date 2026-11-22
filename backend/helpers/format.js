// Indian-style money for messages: 137750 → "₹1,37,750.00"
const formatINR = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Index symbols are stored as "^NSEI"; show them without the caret
const displaySymbol = (symbol) => String(symbol).replace(/^\^/, "");

module.exports = { formatINR, displaySymbol };
