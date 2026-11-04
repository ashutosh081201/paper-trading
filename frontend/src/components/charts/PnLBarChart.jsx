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
import { INR_FORMAT } from "../../utils/formatINR";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PnLBarChart = ({ holdings }) => {
  const { darkMode } = useTheme();

  if (!holdings || holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No holdings data</p>
      </div>
    );
  }

  // Sort by P&L descending
  const sorted = [...holdings].sort((a, b) => b.profitLoss - a.profitLoss);

  const data = {
    labels: sorted.map((h) => h.symbol),
    datasets: [
      {
        label: "P&L (₹)",
        data: sorted.map((h) => parseFloat(h.profitLoss?.toFixed(2))),
        backgroundColor: sorted.map((h) =>
          h.profitLoss >= 0
            ? "rgba(34, 197, 94, 0.7)"
            : "rgba(239, 68, 68, 0.7)",
        ),
        borderColor: sorted.map((h) =>
          h.profitLoss >= 0 ? "#22c55e" : "#ef4444",
        ),
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
            const holding = sorted[context.dataIndex];
            const val = context.parsed.y;
            return [
              ` P&L: ${val >= 0 ? "+" : ""}₹${val?.toLocaleString("en-IN", INR_FORMAT)}`,
              ` Return: ${holding.profitLossPercent >= 0 ? "+" : ""}${holding.profitLossPercent?.toFixed(2)}%`,
              ` Invested: ₹${holding.investedAmount?.toLocaleString("en-IN", INR_FORMAT)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 11 },
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
          dash: [4, 4],
        },
      },
    },
  };

  return (
    <div style={{ height: "220px" }}>
      {/* key={darkMode} forces re-render on theme change */}
      <Bar key={darkMode ? "dark" : "light"} data={data} options={options} />
    </div>
  );
};

export default PnLBarChart;
