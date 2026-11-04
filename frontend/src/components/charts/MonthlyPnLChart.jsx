import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useTheme } from "../../context/ThemeContext";
import { groupMonthlyPnL } from "../../utils/tradeStats";
import { INR_FORMAT } from "../../utils/formatINR";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MonthlyPnLChart = ({ transactions }) => {
  const { darkMode } = useTheme();

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No transaction data</p>
      </div>
    );
  }

  // Filter only sell transactions with P&L
  const sellTrades = transactions.filter(
    (t) => t.transactionType === "sell" && t.profitLoss !== null,
  );

  if (sellTrades.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <p className="text-gray-400 text-sm">No sell trades yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Monthly P&L appears after your first sell
          </p>
        </div>
      </div>
    );
  }

  const monthly = groupMonthlyPnL(sellTrades);

  const data = {
    labels: monthly.map((m) => m.label),
    datasets: [
      {
        label: "Monthly P&L (₹)",
        data: monthly.map((m) => m.pnl),
        backgroundColor: monthly.map((m) =>
          m.pnl >= 0 ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)",
        ),
        borderColor: monthly.map((m) => (m.pnl >= 0 ? "#22c55e" : "#ef4444")),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: darkMode ? "#1f2937" : "#ffffff",
        titleColor: darkMode ? "#f9fafb" : "#111827",
        bodyColor: darkMode ? "#9ca3af" : "#374151",
        borderColor: darkMode ? "#374151" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => {
            const m = monthly[context.dataIndex];
            const val = context.parsed.y;
            return [
              ` P&L: ${val >= 0 ? "+" : ""}₹${val?.toLocaleString("en-IN", INR_FORMAT)}`,
              ` Trades: ${m.trades}`,
              ` Wins: ${m.profitable} | Losses: ${m.loss}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 11 },
          maxRotation: 45,
        },
        border: {
          color: darkMode ? "#374151" : "#e5e7eb",
        },
      },
      y: {
        grid: {
          color: darkMode ? "#1f2937" : "#f3f4f6",
          lineWidth: 1,
        },
        ticks: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 11 },
          callback: (value) => {
            if (Math.abs(value) >= 1000) {
              return `₹${(value / 1000).toFixed(1)}K`;
            }
            return `₹${value}`;
          },
        },
        border: {
          color: darkMode ? "#374151" : "#e5e7eb",
        },
      },
    },
  };

  // Summary stats
  const totalPnL = monthly.reduce((sum, m) => sum + m.pnl, 0);
  const bestMonth = monthly.reduce(
    (best, m) => (m.pnl > best.pnl ? m : best),
    monthly[0],
  );
  const worstMonth = monthly.reduce(
    (worst, m) => (m.pnl < worst.pnl ? m : worst),
    monthly[0],
  );
  const profitableMonths = monthly.filter((m) => m.pnl > 0).length;

  return (
    <div>
      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Total Realized</p>
          <p
            className={`font-bold text-lg ${
              totalPnL >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {totalPnL >= 0 ? "+" : ""}₹
            {parseFloat(totalPnL.toFixed(2))?.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Profitable Months</p>
          <p className="text-green-500 font-bold text-lg">
            {profitableMonths}/{monthly.length}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900/40">
          <p className="text-gray-400 text-xs mb-1">Best Month</p>
          <p className="text-green-500 font-bold text-sm">{bestMonth.label}</p>
          <p className="text-green-500 font-bold">
            +₹{bestMonth.pnl?.toLocaleString("en-IN", INR_FORMAT)}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/40">
          <p className="text-gray-400 text-xs mb-1">Worst Month</p>
          <p className="text-red-500 font-bold text-sm">{worstMonth.label}</p>
          <p className="text-red-500 font-bold">
            ₹{worstMonth.pnl?.toLocaleString("en-IN", INR_FORMAT)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "220px" }}>
        <Bar key={darkMode ? "dark" : "light"} data={data} options={options} />
      </div>

      {/* Monthly Breakdown */}
      <div className="mt-4 space-y-2">
        {monthly.map((m, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  m.pnl >= 0 ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                {m.label}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-gray-400 text-xs">{m.trades} trades</span>
              <span className="text-gray-400 text-xs">
                {m.profitable}W / {m.loss}L
              </span>
              <span
                className={`font-bold text-sm ${
                  m.pnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {m.pnl >= 0 ? "+" : ""}₹{m.pnl?.toLocaleString("en-IN", INR_FORMAT)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyPnLChart;
