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
import { useState } from "react";
import { groupTradesByPeriod } from "../../utils/tradeStats";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TradeFrequencyChart = ({ transactions }) => {
  const { darkMode } = useTheme();
  const [groupBy, setGroupBy] = useState("month");

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No transaction data</p>
      </div>
    );
  }

  const groups = groupTradesByPeriod(transactions, groupBy);

  const data = {
    labels: groups.map((g) => g.label),
    datasets: [
      {
        label: "Buy",
        data: groups.map((g) => g.buys),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderColor: "#22c55e",
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "Sell",
        data: groups.map((g) => g.sells),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderColor: "#ef4444",
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
      legend: {
        position: "top",
        labels: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 11 },
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: darkMode ? "#1f2937" : "#ffffff",
        titleColor: darkMode ? "#f9fafb" : "#111827",
        bodyColor: darkMode ? "#9ca3af" : "#374151",
        borderColor: darkMode ? "#374151" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => {
            const g = groups[context.dataIndex];
            if (context.dataset.label === "Buy") {
              return ` Buys: ${g.buys}`;
            }
            return ` Sells: ${g.sells}`;
          },
          afterBody: (contexts) => {
            const g = groups[contexts[0].dataIndex];
            return [`Total: ${g.total} trades`];
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 10 },
          maxRotation: 45,
        },
        border: {
          color: darkMode ? "#374151" : "#e5e7eb",
        },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        grid: {
          color: darkMode ? "#1f2937" : "#f3f4f6",
          lineWidth: 1,
        },
        ticks: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 11 },
          stepSize: 1,
          callback: (value) => (Number.isInteger(value) ? value : ""),
        },
        border: {
          color: darkMode ? "#374151" : "#e5e7eb",
        },
      },
    },
  };

  // Summary stats
  const totalTrades = transactions.length;
  const totalBuys = transactions.filter(
    (t) => t.transactionType === "buy",
  ).length;
  const totalSells = transactions.filter(
    (t) => t.transactionType === "sell",
  ).length;
  const mostActiveGroup = groups.reduce(
    (max, g) => (g.total > max.total ? g : max),
    groups[0],
  );
  const avgPerGroup =
    groups.length > 0
      ? parseFloat((totalTrades / groups.length).toFixed(1))
      : 0;

  return (
    <div>
      {/* Group By Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-400 text-xs font-medium">Group by:</span>
        {["day", "week", "month"].map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition capitalize ${
              groupBy === g
                ? "bg-green-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Total Trades</p>
          <p className="text-gray-900 dark:text-white font-bold text-xl">
            {totalTrades}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900/40">
          <p className="text-gray-400 text-xs mb-1">Total Buys</p>
          <p className="text-green-500 font-bold text-xl">{totalBuys}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/40">
          <p className="text-gray-400 text-xs mb-1">Total Sells</p>
          <p className="text-red-500 font-bold text-xl">{totalSells}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/40">
          <p className="text-gray-400 text-xs mb-1">Most Active</p>
          <p className="text-blue-500 font-bold text-sm">
            {mostActiveGroup?.label}
          </p>
          <p className="text-blue-400 text-xs">
            {mostActiveGroup?.total} trades
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "220px" }}>
        <Bar
          key={`${darkMode ? "dark" : "light"}-${groupBy}`}
          data={data}
          options={options}
        />
      </div>

      {/* Avg per period */}
      <div className="mt-3 flex items-center justify-center gap-1 text-gray-400 text-xs">
        <span>Average</span>
        <span className="text-green-400 font-semibold">{avgPerGroup}</span>
        <span>
          trades per{" "}
          {groupBy === "day" ? "day" : groupBy === "week" ? "week" : "month"}
        </span>
      </div>
    </div>
  );
};

export default TradeFrequencyChart;
