// Grouping of transactions for the Portfolio charts.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "YYYY-MM-DD" in the browser's timezone. toISOString() would use UTC and put
// early-morning IST trades on the previous day.
const localDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Counts buys and sells per day, week (Monday start) or month.
export const groupTradesByPeriod = (transactions, groupBy) => {
  const groupMap = {};

  transactions.forEach((t) => {
    const date = new Date(t.createdAt);
    let key = "";
    let label = "";

    if (groupBy === "day") {
      key = localDateKey(date);
      label = date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    } else if (groupBy === "week") {
      // Start of week (Monday), at midnight so the time of day doesn't matter
      const day = date.getDay();
      const monday = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - (day === 0 ? 6 : day - 1),
      );
      key = localDateKey(monday);
      label = `W ${monday.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
      label = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    }

    if (!groupMap[key]) {
      groupMap[key] = {
        key,
        label,
        total: 0,
        buys: 0,
        sells: 0,
      };
    }

    groupMap[key].total += 1;
    if (t.transactionType === "buy") groupMap[key].buys += 1;
    if (t.transactionType === "sell") groupMap[key].sells += 1;
  });

  return Object.values(groupMap).sort((a, b) => a.key.localeCompare(b.key));
};

// Sums realised P&L of sell trades per calendar month, oldest first.
export const groupMonthlyPnL = (sellTrades) => {
  const monthlyMap = {};

  sellTrades.forEach((t) => {
    const date = new Date(t.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        year,
        month,
        label: `${MONTHS[month]} ${year}`,
        pnl: 0,
        trades: 0,
        profitable: 0,
        loss: 0,
      };
    }

    monthlyMap[key].pnl += t.profitLoss;
    monthlyMap[key].trades += 1;
    if (t.profitLoss > 0) monthlyMap[key].profitable += 1;
    if (t.profitLoss < 0) monthlyMap[key].loss += 1;
  });

  // Sort by date ascending
  return Object.values(monthlyMap)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    })
    .map((m) => ({
      ...m,
      pnl: parseFloat(m.pnl.toFixed(2)),
    }));
};
