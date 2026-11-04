import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "../../context/ThemeContext";
import { INR_FORMAT } from "../../utils/formatINR";

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  "#4ade80",
  "#60a5fa",
  "#f97316",
  "#a78bfa",
  "#f43f5e",
  "#34d399",
  "#fbbf24",
  "#38bdf8",
  "#c084fc",
  "#fb7185",
  "#86efac",
  "#93c5fd",
];

const centerTextPlugin = {
  id: "centerText",
  beforeDraw(chart) {
    const { ctx, data, chartArea } = chart;
    if (!chartArea) return;

    const total = data.datasets[0]._total;
    if (!total) return;

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();

    ctx.font = "11px Arial";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Total Value", centerX, centerY - 12);

    ctx.font = "bold 13px Arial";
    ctx.fillStyle = chart.options._isDark ? "#ffffff" : "#111827";
    ctx.fillText(total, centerX, centerY + 10);

    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

const HoldingsPieChart = ({ holdings }) => {
  const { darkMode } = useTheme();

  if (!holdings || holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No holdings data</p>
      </div>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

  const formattedTotal = `₹${totalValue?.toLocaleString("en-IN", INR_FORMAT)}`;

  const data = {
    labels: holdings.map((h) => h.symbol),
    datasets: [
      {
        data: holdings.map((h) =>
          parseFloat(((h.currentValue / totalValue) * 100).toFixed(2)),
        ),
        backgroundColor: holdings.map(
          (_, i) => COLORS[i % COLORS.length] + "cc",
        ),
        borderColor: holdings.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 1.5,
        hoverOffset: 8,
        _total: formattedTotal,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    _isDark: darkMode,
    plugins: {
      legend: {
        position: "right",
        labels: {
          // Key fix: use correct color for dark/light mode
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 11 },
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8,
          generateLabels: (chart) => {
            const dataset = chart.data.datasets[0];
            return chart.data.labels.map((label, i) => ({
              text: `${label} (${dataset.data[i]}%)`,
              fillStyle: dataset.backgroundColor[i],
              strokeStyle: dataset.borderColor[i],
              lineWidth: 1,
              pointStyle: "circle",
              hidden: false,
              index: i,
              // Force text color per label
              fontColor: darkMode ? "#e5e7eb" : "#374151",
            }));
          },
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
            const holding = holdings[context.dataIndex];
            return [
              ` ${context.parsed.toFixed(2)}% of portfolio`,
              ` Value: ₹${holding.currentValue?.toLocaleString("en-IN", INR_FORMAT)}`,
              ` P&L: ${holding.profitLoss >= 0 ? "+" : ""}₹${holding.profitLoss?.toLocaleString("en-IN", INR_FORMAT)}`,
            ];
          },
        },
      },
    },
    cutout: "65%",
  };

  return (
    <div style={{ height: "220px" }}>
      {/* key={darkMode} forces Chart.js to re-render on theme change */}
      <Doughnut
        key={darkMode ? "dark" : "light"}
        data={data}
        options={options}
      />
    </div>
  );
};

export default HoldingsPieChart;
