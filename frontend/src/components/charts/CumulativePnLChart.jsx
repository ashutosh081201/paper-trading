import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useTheme } from "../../context/ThemeContext";
import { INR_FORMAT } from "../../utils/formatINR";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const CumulativePnLChart = ({ transactions }) => {
  const { darkMode } = useTheme();

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No transaction data</p>
      </div>
    );
  }

  // Filter only sell transactions with P&L
  const sellTrades = transactions
    .filter((t) => t.transactionType === "sell" && t.profitLoss !== null)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (sellTrades.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">
          No sell trades yet — P&L will appear after your first sell
        </p>
      </div>
    );
  }

  // Calculate cumulative P&L
  const cumulativeData = sellTrades.reduce((acc, t) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].value : 0;
    acc.push({
      date: new Date(t.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      value: parseFloat((prev + t.profitLoss).toFixed(2)),
      pnl: t.profitLoss,
      symbol: t.symbol,
    });
    return acc;
  }, []);
  const isOverallProfit = cumulativeData[cumulativeData.length - 1].value >= 0;

  const lineColor = isOverallProfit ? "#22c55e" : "#ef4444";
  const fillColor = isOverallProfit
    ? "rgba(34, 197, 94, 0.1)"
    : "rgba(239, 68, 68, 0.1)";

  const data = {
    labels: cumulativeData.map((d) => d.date),
    datasets: [
      {
        label: "Cumulative P&L",
        data: cumulativeData.map((d) => d.value),
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: cumulativeData.length > 30 ? 0 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: cumulativeData.map((d) =>
          d.value >= 0 ? "#22c55e" : "#ef4444",
        ),
        pointBorderColor: cumulativeData.map((d) =>
          d.value >= 0 ? "#22c55e" : "#ef4444",
        ),
        tension: 0.3,
        fill: true,
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
          title: (context) => {
            const d = cumulativeData[context[0].dataIndex];
            return `${d.date} — ${d.symbol}`;
          },
          label: (context) => {
            const d = cumulativeData[context.dataIndex];
            return [
              ` Cumulative: ${context.parsed.y >= 0 ? "+" : ""}₹${context.parsed.y?.toLocaleString("en-IN", INR_FORMAT)}`,
              ` This trade: ${d.pnl >= 0 ? "+" : ""}₹${d.pnl?.toLocaleString("en-IN", INR_FORMAT)}`,
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
          font: { size: 10 },
          maxTicksLimit: 10,
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

  const finalPnL = cumulativeData[cumulativeData.length - 1].value;

  return (
    <div>
      {/* Summary row */}
      <div className="flex items-center gap-6 mb-4">
        <div>
          <p className="text-gray-400 text-xs">Total Realized P&L</p>
          <p
            className={`font-bold text-lg ${
              finalPnL >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {finalPnL >= 0 ? "+" : ""}₹{finalPnL?.toLocaleString("en-IN", INR_FORMAT)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Total Sell Trades</p>
          <p className="text-gray-900 dark:text-white font-bold text-lg">
            {sellTrades.length}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Best Trade</p>
          <p className="text-green-500 font-bold text-lg">
            +₹
            {Math.max(...sellTrades.map((t) => t.profitLoss))?.toLocaleString(
              "en-IN",
            )}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Worst Trade</p>
          <p className="text-red-500 font-bold text-lg">
            ₹
            {Math.min(...sellTrades.map((t) => t.profitLoss))?.toLocaleString(
              "en-IN",
            )}
          </p>
        </div>
      </div>

      <div style={{ height: "200px" }}>
        <Line key={darkMode ? "dark" : "light"} data={data} options={options} />
      </div>
    </div>
  );
};

export default CumulativePnLChart;
