import { useEffect, useState } from "react";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useTheme } from "../../context/ThemeContext";
import { getHistoricalData } from "../../services/api";
import { INR_FORMAT } from "../../utils/formatINR";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

// Calculate annualized volatility from daily returns
const calculateVolatility = (candlestickData) => {
  if (candlestickData.length < 2) return 0;

  const dailyReturns = [];
  for (let i = 1; i < candlestickData.length; i++) {
    const ret =
      (candlestickData[i].close - candlestickData[i - 1].close) /
      candlestickData[i - 1].close;
    dailyReturns.push(ret);
  }

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    dailyReturns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize: multiply by sqrt(252) trading days
  const annualized = stdDev * Math.sqrt(252) * 100;
  return parseFloat(annualized.toFixed(2));
};

// Quadrant label
const getQuadrant = (risk, returnPct) => {
  if (returnPct >= 0 && risk <= 30)
    return { label: "Low Risk, Profit ⭐", color: "#22c55e" };
  if (returnPct >= 0 && risk > 30)
    return { label: "High Risk, Profit 🎲", color: "#f97316" };
  if (returnPct < 0 && risk <= 30)
    return { label: "Low Risk, Loss 😐", color: "#60a5fa" };
  return { label: "High Risk, Loss ❌", color: "#ef4444" };
};

const RiskReturnChart = ({ holdings }) => {
  const { darkMode } = useTheme();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!holdings || holdings.length === 0) return;
    fetchVolatilityData();
  }, [holdings]);

  async function fetchVolatilityData() {
    try {
      setLoading(true);
      setError("");

      // Fetch 3 months of daily data for each holding
      const results = await Promise.all(
        holdings.map(async (holding) => {
          try {
            const res = await getHistoricalData(holding.symbol, "1d", "3mo");
            const volatility = calculateVolatility(res.data.candlestickData);
            return {
              symbol: holding.symbol,
              companyName: holding.companyName,
              risk: volatility,
              returnPct: holding.profitLossPercent,
              profitLoss: holding.profitLoss,
              currentValue: holding.currentValue,
            };
          } catch {
            return {
              symbol: holding.symbol,
              companyName: holding.companyName,
              risk: 0,
              returnPct: holding.profitLossPercent,
              profitLoss: holding.profitLoss,
              currentValue: holding.currentValue,
            };
          }
        }),
      );

      setChartData(results);
    } catch {
      setError("Failed to load risk data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">
            Calculating risk for {holdings.length} holdings...
          </p>
          <p className="text-gray-500 text-xs mt-1">
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={fetchVolatilityData}
            className="mt-3 text-green-400 hover:text-green-300 text-xs transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
  }

  // Build scatter datasets by quadrant
  const quadrantGroups = {
    "Low Risk, Profit ⭐": { data: [], color: "#22c55e" },
    "High Risk, Profit 🎲": { data: [], color: "#f97316" },
    "Low Risk, Loss 😐": { data: [], color: "#60a5fa" },
    "High Risk, Loss ❌": { data: [], color: "#ef4444" },
  };

  chartData.forEach((d) => {
    const { label } = getQuadrant(d.risk, d.returnPct);
    quadrantGroups[label].data.push({
      x: d.risk,
      y: d.returnPct,
      symbol: d.symbol,
      companyName: d.companyName,
      profitLoss: d.profitLoss,
      currentValue: d.currentValue,
    });
  });

  const datasets = Object.entries(quadrantGroups)
    .filter(([, v]) => v.data.length > 0)
    .map(([label, v]) => ({
      label,
      data: v.data,
      backgroundColor: v.color + "cc",
      borderColor: v.color,
      borderWidth: 1.5,
      pointRadius: 8,
      pointHoverRadius: 11,
    }));

  const data = { datasets };

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
          title: (contexts) => {
            const point = contexts[0].raw;
            return `${point.symbol} — ${point.companyName}`;
          },
          label: (context) => {
            const point = context.raw;
            return [
              ` Risk (Volatility): ${point.x?.toFixed(1)}%`,
              ` Return: ${point.y >= 0 ? "+" : ""}${point.y?.toFixed(2)}%`,
              ` P&L: ${point.profitLoss >= 0 ? "+" : ""}₹${point.profitLoss?.toLocaleString("en-IN", INR_FORMAT)}`,
              ` Value: ₹${point.currentValue?.toLocaleString("en-IN", INR_FORMAT)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Risk (Annualized Volatility %)",
          color: darkMode ? "#9ca3af" : "#374151",
          font: { size: 11 },
        },
        grid: {
          color: darkMode ? "#1f2937" : "#f3f4f6",
        },
        ticks: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 10 },
          callback: (value) => `${value}%`,
        },
        border: {
          color: darkMode ? "#374151" : "#e5e7eb",
        },
      },
      y: {
        title: {
          display: true,
          text: "Return (%)",
          color: darkMode ? "#9ca3af" : "#374151",
          font: { size: 11 },
        },
        grid: {
          color: darkMode ? "#1f2937" : "#f3f4f6",
        },
        ticks: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 10 },
          callback: (value) => `${value}%`,
        },
        border: {
          color: darkMode ? "#374151" : "#e5e7eb",
        },
      },
    },
  };

  // Summary stats
  const avgRisk =
    chartData.reduce((sum, d) => sum + d.risk, 0) / chartData.length;
  const avgReturn =
    chartData.reduce((sum, d) => sum + d.returnPct, 0) / chartData.length;
  const bestRiskAdjusted = [...chartData]
    .filter((d) => d.risk > 0)
    .sort((a, b) => b.returnPct / b.risk - a.returnPct / a.risk)[0];
  const worstRiskAdjusted = [...chartData]
    .filter((d) => d.risk > 0)
    .sort((a, b) => a.returnPct / a.risk - b.returnPct / b.risk)[0];

  return (
    <div>
      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Avg Portfolio Risk</p>
          <p className="text-gray-900 dark:text-white font-bold text-lg">
            {avgRisk.toFixed(1)}%
          </p>
          <p className="text-gray-400 text-xs">annualized volatility</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Avg Return</p>
          <p
            className={`font-bold text-lg ${
              avgReturn >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {avgReturn >= 0 ? "+" : ""}
            {avgReturn.toFixed(2)}%
          </p>
          <p className="text-gray-400 text-xs">across all holdings</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900/40">
          <p className="text-gray-400 text-xs mb-1">Best Risk-Adjusted</p>
          <p className="text-green-500 font-bold text-sm">
            {bestRiskAdjusted?.symbol || "—"}
          </p>
          <p className="text-green-400 text-xs">
            {bestRiskAdjusted
              ? `+${bestRiskAdjusted.returnPct?.toFixed(1)}% at ${bestRiskAdjusted.risk?.toFixed(1)}% risk`
              : ""}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/40">
          <p className="text-gray-400 text-xs mb-1">Worst Risk-Adjusted</p>
          <p className="text-red-500 font-bold text-sm">
            {worstRiskAdjusted?.symbol || "—"}
          </p>
          <p className="text-red-400 text-xs">
            {worstRiskAdjusted
              ? `${worstRiskAdjusted.returnPct?.toFixed(1)}% at ${worstRiskAdjusted.risk?.toFixed(1)}% risk`
              : ""}
          </p>
        </div>
      </div>

      {/* Quadrant Guide */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/10 rounded-lg px-3 py-2">
          <span>⭐</span>
          <span className="text-green-600 dark:text-green-400 font-medium">
            Top-Left = Ideal (Low Risk, High Return)
          </span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2">
          <span>❌</span>
          <span className="text-red-600 dark:text-red-400 font-medium">
            Bottom-Right = Worst (High Risk, Low Return)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "280px" }}>
        <Scatter
          key={darkMode ? "dark" : "light"}
          data={data}
          options={options}
        />
      </div>

      {/* Stock Labels Below Chart */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.map((d) => {
          const { color } = getQuadrant(d.risk, d.returnPct);
          return (
            <div
              key={d.symbol}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border"
              style={{
                borderColor: color,
                backgroundColor: color + "15",
                color: color,
              }}
            >
              <span className="font-semibold">{d.symbol}</span>
              <span className="opacity-70">
                {d.returnPct >= 0 ? "+" : ""}
                {d.returnPct?.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-gray-400 text-xs mt-3 text-center">
        Risk calculated from 3-month annualized volatility of daily returns
      </p>
    </div>
  );
};

export default RiskReturnChart;
