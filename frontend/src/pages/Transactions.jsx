import { useState, useEffect } from "react";
import { getTransactions } from "../services/api";
import { INR_FORMAT } from "../utils/formatINR";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      setError("");
      const res = await getTransactions();
      setTransactions(res.data.transactions);
    } catch {
      setError("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "buy") return t.transactionType === "buy";
    if (filter === "sell") return t.transactionType === "sell";
    if (filter === "delivery") return t.orderType === "delivery";
    if (filter === "intraday") return t.orderType === "intraday";
    return true;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = [
      "Date",
      "Time",
      "Symbol",
      "Company",
      "Type",
      "Order Type",
      "Quantity",
      "Buy Price",
      "Sell Price",
      "Total Amount",
      "P&L",
      "Holding Duration",
      "Balance After",
    ];

    const rows = filteredTransactions.map((t) => [
      formatDate(t.createdAt),
      formatTime(t.createdAt),
      t.symbol,
      t.companyName,
      t.transactionType.toUpperCase(),
      t.orderType === "delivery" ? "CNC" : "MIS",
      t.quantity,
      t.buyPrice,
      t.sellPrice || "",
      t.totalAmount,
      t.profitLoss !== null ? t.profitLoss : "",
      t.holdingDuration || "",
      t.fundsAfter,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell,
          )
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // en-CA formats as YYYY-MM-DD in the browser's own timezone
    link.download = `stocklab_transactions_${new Date().toLocaleDateString("en-CA")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (filteredTransactions.length === 0) return;

    const rows = filteredTransactions
      .map(
        (t) => `
      <tr>
        <td>${t.symbol}</td>
        <td>${t.companyName}</td>
        <td>${formatDate(t.createdAt)} ${formatTime(t.createdAt)}</td>
        <td style="color: ${t.transactionType === "buy" ? "green" : "red"}">
          ${t.transactionType.toUpperCase()}
        </td>
        <td>${t.orderType === "delivery" ? "CNC" : "MIS"}</td>
        <td>${t.quantity}</td>
        <td>₹${t.buyPrice?.toLocaleString("en-IN", INR_FORMAT)}</td>
        <td>${t.sellPrice ? "₹" + t.sellPrice?.toLocaleString("en-IN") : "—"}</td>
        <td style="color: ${t.profitLoss === null ? "inherit" : t.profitLoss >= 0 ? "green" : "red"}">
          ${t.profitLoss !== null ? (t.profitLoss >= 0 ? "+" : "") + "₹" + t.profitLoss?.toLocaleString("en-IN") : "—"}
        </td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <!DOCTYPE html><html><head><title>StockLab — Trade History</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; color: #16a34a; }
        p { margin: 0 0 16px; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 8px 6px; text-align: left; font-size: 11px; border: 1px solid #e5e7eb; color: #374151; text-transform: uppercase; }
        td { padding: 7px 6px; border: 1px solid #e5e7eb; font-size: 11px; }
        tr:nth-child(even) { background: #f9fafb; }
        .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
      </style></head><body>
        <h1>StockLab — Trade History</h1>
        <p>Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} • Total: ${filteredTransactions.length} records</p>
        <table><thead><tr>
          <th>Symbol</th><th>Company</th><th>Date & Time</th><th>Type</th>
          <th>Order</th><th>Qty</th><th>Buy Price</th><th>Sell Price</th><th>P&L</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">Made with ❤️ by Ashutosh — StockLab Paper Trading</div>
      </body></html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // ── P&L STATEMENT PDF ─────────────────────────────────────────
  const exportStatement = () => {
    if (transactions.length === 0) return;

    // Only sell transactions have P&L
    const sellTransactions = transactions.filter(
      (t) => t.transactionType === "sell" && t.profitLoss !== null,
    );

    // Summary stats
    const totalTrades = sellTransactions.length;
    const totalProfit = sellTransactions
      .filter((t) => t.profitLoss > 0)
      .reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLoss = sellTransactions
      .filter((t) => t.profitLoss < 0)
      .reduce((sum, t) => sum + t.profitLoss, 0);
    const netPnL = totalProfit + totalLoss;
    const winRate =
      totalTrades > 0
        ? (
            (sellTransactions.filter((t) => t.profitLoss > 0).length /
              totalTrades) *
            100
          ).toFixed(1)
        : 0;
    const bestTrade =
      sellTransactions.length > 0
        ? Math.max(...sellTransactions.map((t) => t.profitLoss))
        : 0;
    const worstTrade =
      sellTransactions.length > 0
        ? Math.min(...sellTransactions.map((t) => t.profitLoss))
        : 0;

    // Group all transactions by month
    const grouped = {};
    transactions.forEach((t) => {
      const date = new Date(t.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      if (!grouped[key]) grouped[key] = { label, trades: [], pnl: 0 };
      grouped[key].trades.push(t);
      if (t.profitLoss !== null) grouped[key].pnl += t.profitLoss;
    });

    // Sort months newest first
    const sortedMonths = Object.entries(grouped).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );

    const monthSections = sortedMonths
      .map(([, { label, trades, pnl }]) => {
        const rows = trades
          .map(
            (t) => `
        <tr>
          <td>${formatDate(t.createdAt)}</td>
          <td><strong>${t.symbol}</strong><br><span style="color:#6b7280;font-size:10px">${t.companyName}</span></td>
          <td style="text-align:center">
            <span style="background:${t.transactionType === "buy" ? "#dcfce7" : "#fee2e2"};color:${t.transactionType === "buy" ? "#16a34a" : "#dc2626"};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold">
              ${t.transactionType.toUpperCase()}
            </span>
          </td>
          <td style="text-align:center">
            <span style="background:${t.orderType === "delivery" ? "#dbeafe" : "#fef9c3"};color:${t.orderType === "delivery" ? "#1d4ed8" : "#92400e"};padding:2px 6px;border-radius:4px;font-size:10px">
              ${t.orderType === "delivery" ? "CNC" : "MIS"}
            </span>
          </td>
          <td style="text-align:right">${t.quantity}</td>
          <td style="text-align:right">₹${t.buyPrice?.toLocaleString("en-IN", INR_FORMAT)}</td>
          <td style="text-align:right">${t.sellPrice ? "₹" + t.sellPrice?.toLocaleString("en-IN") : "—"}</td>
          <td style="text-align:right;font-weight:bold;color:${t.profitLoss === null ? "#6b7280" : t.profitLoss >= 0 ? "#16a34a" : "#dc2626"}">
            ${t.profitLoss !== null ? (t.profitLoss >= 0 ? "+" : "") + "₹" + Math.abs(t.profitLoss).toLocaleString("en-IN") : "—"}
          </td>
        </tr>
      `,
          )
          .join("");

        const monthPnLColor = pnl >= 0 ? "#16a34a" : "#dc2626";

        return `
        <div class="month-section">
          <div class="month-header">
            <span>${label}</span>
            <span style="color:${monthPnLColor};font-weight:bold">
              Net P&L: ${pnl >= 0 ? "+" : ""}₹${pnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Stock</th>
                <th style="text-align:center">Type</th>
                <th style="text-align:center">Order</th>
                <th style="text-align:right">Qty</th>
                <th style="text-align:right">Buy ₹</th>
                <th style="text-align:right">Sell ₹</th>
                <th style="text-align:right">P&L</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>StockLab — P&L Statement</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
          .page { max-width: 900px; margin: 0 auto; padding: 30px 24px; }

          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #16a34a; padding-bottom: 16px; }
          .header-left h1 { font-size: 22px; color: #16a34a; font-weight: bold; }
          .header-left p { color: #6b7280; font-size: 11px; margin-top: 4px; }
          .header-right { text-align: right; }
          .header-right p { font-size: 11px; color: #6b7280; }
          .header-right strong { color: #111; }

          /* Summary Cards */
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
          .card-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .card-value { font-size: 16px; font-weight: bold; color: #111; }
          .card-value.green { color: #16a34a; }
          .card-value.red { color: #dc2626; }
          .card-sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }

          /* Month Section */
          .month-section { margin-bottom: 28px; }
          .month-header { display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px 6px 0 0; padding: 10px 14px; font-size: 13px; font-weight: bold; color: #374151; }
          table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-top: none; }
          th { background: #f3f4f6; padding: 8px 10px; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
          td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: #f9fafb; }

          /* Footer */
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
          .footer-left { font-size: 10px; color: #9ca3af; }
          .footer-right { font-size: 10px; color: #9ca3af; }
          .disclaimer { margin-top: 10px; font-size: 9px; color: #9ca3af; text-align: center; }

          @media print {
            body { padding: 0; }
            .page { padding: 16px; }
            .month-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <h1>Stock<span style="color:#111">Lab</span></h1>
              <p>P&L Statement — All Time</p>
            </div>
            <div class="header-right">
              <p>Generated: <strong>${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong></p>
              <p>Total Transactions: <strong>${transactions.length}</strong></p>
              <p>Closed Trades: <strong>${totalTrades}</strong></p>
            </div>
          </div>

          <!-- Summary -->
          <div class="summary">
            <div class="card">
              <div class="card-label">Net P&L</div>
              <div class="card-value ${netPnL >= 0 ? "green" : "red"}">
                ${netPnL >= 0 ? "+" : ""}₹${Math.abs(netPnL).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div class="card-sub">Overall profit/loss</div>
            </div>
            <div class="card">
              <div class="card-label">Total Profit</div>
              <div class="card-value green">+₹${totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">${sellTransactions.filter((t) => t.profitLoss > 0).length} winning trades</div>
            </div>
            <div class="card">
              <div class="card-label">Total Loss</div>
              <div class="card-value red">₹${Math.abs(totalLoss).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">${sellTransactions.filter((t) => t.profitLoss < 0).length} losing trades</div>
            </div>
            <div class="card">
              <div class="card-label">Win Rate</div>
              <div class="card-value ${parseFloat(winRate) >= 50 ? "green" : "red"}">${winRate}%</div>
              <div class="card-sub">${totalTrades} closed trades</div>
            </div>
            <div class="card">
              <div class="card-label">Best Trade</div>
              <div class="card-value green">+₹${Math.abs(bestTrade).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">Highest single profit</div>
            </div>
            <div class="card">
              <div class="card-label">Worst Trade</div>
              <div class="card-value red">${worstTrade < 0 ? `-₹${Math.abs(worstTrade).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div>
              <div class="card-sub">${worstTrade < 0 ? "Biggest single loss" : "No losing trades"}</div>
            </div>
          </div>

          <!-- Month-wise Sections -->
          ${monthSections}

          <!-- Footer -->
          <div class="footer">
            <div class="footer-left">StockLab Paper Trading Platform</div>
            <div class="footer-right">Made with ❤️ by Ashutosh</div>
          </div>
          <div class="disclaimer">
            ⚠️ This is a paper trading statement for educational purposes only. Not a real financial statement.
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Trade History
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            {filteredTransactions.length} total transactions
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap justify-end">
          <button
            onClick={fetchTransactions}
            className="bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition"
          >
            🔄 <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={filteredTransactions.length === 0}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-1"
          >
            📥 <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={exportPDF}
            disabled={filteredTransactions.length === 0}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-1"
          >
            📄 <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={exportStatement}
            disabled={transactions.length === 0}
            className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-1"
          >
            📊 <span className="hidden sm:inline">Statement</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-600 dark:text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
        {["all", "buy", "sell", "delivery", "intraday"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition capitalize flex-shrink-0 ${
              filter === f
                ? "bg-green-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm flex items-center ml-2 flex-shrink-0">
          {filteredTransactions.length} records
        </span>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-gray-400 text-lg mb-2">No transactions yet</p>
            <p className="text-gray-500 text-sm">
              Your trade history will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Table Header — desktop only */}
            <div className="hidden sm:grid grid-cols-7 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stock
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                Type
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Qty
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Price
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                P&L
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Date
              </div>
            </div>

            {/* Table Rows */}
            {filteredTransactions.map((transaction, index) => (
              <div
                key={index}
                className="border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                {/* Mobile Card */}
                <div className="sm:hidden px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        {transaction.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">
                        {transaction.companyName}
                      </p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      {transaction.profitLoss !== null ? (
                        <p
                          className={`text-sm font-bold ${transaction.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {transaction.profitLoss >= 0 ? "+" : ""}₹
                          {transaction.profitLoss?.toLocaleString(
                            "en-IN",
                            INR_FORMAT,
                          )}
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm">—</p>
                      )}
                      <p className="text-gray-400 text-xs mt-0.5">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        transaction.transactionType === "buy"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.transactionType.toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        transaction.orderType === "delivery"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {transaction.orderType === "delivery" ? "CNC" : "MIS"}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      Qty: {transaction.quantity}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      ₹
                      {transaction.buyPrice?.toLocaleString(
                        "en-IN",
                        INR_FORMAT,
                      )}
                    </span>
                    {transaction.holdingDuration && (
                      <span className="text-gray-400 text-xs">
                        ⏱ {transaction.holdingDuration}
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop Row */}
                <div className="hidden sm:grid grid-cols-7 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <div className="col-span-2">
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">
                      {transaction.symbol}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      {transaction.companyName}
                    </p>
                    {transaction.holdingDuration && (
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                        ⏱ {transaction.holdingDuration}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 items-center justify-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        transaction.transactionType === "buy"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.transactionType.toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        transaction.orderType === "delivery"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {transaction.orderType === "delivery" ? "CNC" : "MIS"}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white text-sm font-medium">
                      {transaction.quantity}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white text-sm">
                      ₹
                      {transaction.buyPrice?.toLocaleString(
                        "en-IN",
                        INR_FORMAT,
                      )}
                    </p>
                    {transaction.sellPrice && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        Sell: ₹
                        {transaction.sellPrice?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    {transaction.profitLoss !== null ? (
                      <p
                        className={`text-sm font-bold ${transaction.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {transaction.profitLoss >= 0 ? "+" : ""}₹
                        {transaction.profitLoss?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm">—</p>
                    )}
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                      Bal: ₹
                      {transaction.fundsAfter?.toLocaleString(
                        "en-IN",
                        INR_FORMAT,
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white text-sm">
                      {formatDate(transaction.createdAt)}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      {formatTime(transaction.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Transactions;
