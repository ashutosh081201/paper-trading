// Portfolio maths shown on the Portfolio page.

// ── XIRR ─────────────────────────────────────────────────────────
export const calculateXIRR = (cashFlows, dates) => {
  if (!cashFlows || cashFlows.length < 2) return null;
  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) return null;
  const startDate = dates[0];
  const npv = (rate) =>
    cashFlows.reduce((sum, cf, i) => {
      const days = (dates[i] - startDate) / (1000 * 60 * 60 * 24);
      return sum + cf / Math.pow(1 + rate, days / 365);
    }, 0);
  const dnpv = (rate) =>
    cashFlows.reduce((sum, cf, i) => {
      const days = (dates[i] - startDate) / (1000 * 60 * 60 * 24);
      if (days === 0) return sum;
      return sum - ((days / 365) * cf) / Math.pow(1 + rate, days / 365 + 1);
    }, 0);
  let rate = 0.1;
  for (let i = 0; i < 200; i++) {
    const npvVal = npv(rate);
    const dnpvVal = dnpv(rate);
    if (Math.abs(dnpvVal) < 1e-10) break;
    const newRate = rate - npvVal / dnpvVal;
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
    if (rate <= -1) rate = -0.99;
  }
  return rate;
};

export const computeXIRR = (transactions, holdings) => {
  try {
    if (!transactions || transactions.length === 0) return null;
    const cashFlows = [];
    const dates = [];
    transactions.forEach((t) => {
      if (t.transactionType === "buy") {
        cashFlows.push(-Math.abs(t.totalAmount));
        dates.push(new Date(t.createdAt));
      } else if (t.transactionType === "sell") {
        cashFlows.push(Math.abs(t.totalAmount));
        dates.push(new Date(t.createdAt));
      }
    });
    const holdingsValue = holdings.reduce(
      (sum, h) => sum + (h.currentPrice || 0) * h.quantity,
      0,
    );
    if (holdingsValue > 0) {
      cashFlows.push(holdingsValue);
      dates.push(new Date());
    }
    if (cashFlows.length < 2) return null;
    const combined = cashFlows.map((cf, i) => ({ cf, date: dates[i] }));
    combined.sort((a, b) => a.date - b.date);
    const result = calculateXIRR(
      combined.map((c) => c.cf),
      combined.map((c) => c.date),
    );
    if (result === null || isNaN(result) || !isFinite(result)) return null;
    return (result * 100).toFixed(2);
  } catch {
    return null;
  }
};

export const getXIRRLabel = (xirr) => {
  const val = parseFloat(xirr);
  if (val >= 30) return { label: "Excellent 🚀", color: "text-green-500" };
  if (val >= 15) return { label: "Good 📈", color: "text-green-400" };
  if (val >= 0) return { label: "Moderate ➡️", color: "text-yellow-500" };
  return { label: "Negative 📉", color: "text-red-500" };
};

// ── Sector Performance ───────────────────────────────────────────
export const computeSectorPerformance = (holdings) => {
  if (!holdings || holdings.length === 0) return [];
  const sectorMap = {};
  holdings.forEach((h) => {
    const sector = h.sector || "Others";
    if (!sectorMap[sector])
      sectorMap[sector] = {
        sector,
        invested: 0,
        currentValue: 0,
        profitLoss: 0,
        stocks: [],
      };
    const invested = (h.avgBuyPrice || 0) * h.quantity;
    const current = (h.currentPrice || 0) * h.quantity;
    sectorMap[sector].invested += invested;
    sectorMap[sector].currentValue += current;
    sectorMap[sector].profitLoss += current - invested;
    sectorMap[sector].stocks.push(h.symbol);
  });
  return Object.values(sectorMap)
    .map((s) => ({
      ...s,
      pnlPercent:
        s.invested > 0
          ? parseFloat(((s.profitLoss / s.invested) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.pnlPercent - a.pnlPercent);
};

// P&L for today. Shares first bought today have no "yesterday" — their P&L
// is against the buy price, not the day's change.
export const computeTodayPnL = (holdings, now = new Date()) =>
  holdings.reduce((sum, h) => {
    const boughtToday =
      h.buyDate && new Date(h.buyDate).toDateString() === now.toDateString();
    const perShare = boughtToday
      ? (h.currentPrice || 0) - (h.avgBuyPrice || 0)
      : h.dayChange || 0;
    return sum + perShare * h.quantity;
  }, 0);
