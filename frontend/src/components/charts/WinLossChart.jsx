import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "../../context/ThemeContext";

ChartJS.register(ArcElement, Tooltip, Legend);

const centerTextPlugin = {
  id: "winLossCenterText",
  beforeDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    const winRate = chart.options._winRate;
    if (winRate === undefined) return;

    ctx.save();

    ctx.font = "11px Arial";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Win Rate", centerX, centerY - 12);

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = winRate >= 50 ? "#22c55e" : "#ef4444";
    ctx.fillText(`${winRate}%`, centerX, centerY + 10);

    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

const WinLossChart = ({ analytics }) => {
  const { darkMode } = useTheme();

  if (!analytics || analytics.totalSells === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <p className="text-gray-400 text-sm">No sell trades yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Win/Loss ratio appears after your first sell
          </p>
        </div>
      </div>
    );
  }

  const profitable = analytics.profitableSells || 0;
  const breakeven = analytics.breakevenSells || 0;
  const loss = analytics.lossSells || 0;
  const winRate = analytics.winRate || 0;

  // Only include breakeven slice if > 0
  const labels = [
    "Profitable",
    ...(breakeven > 0 ? ["Breakeven"] : []),
    "Loss",
  ];
  const dataValues = [profitable, ...(breakeven > 0 ? [breakeven] : []), loss];
  const bgColors = [
    "rgba(34, 197, 94, 0.7)",
    ...(breakeven > 0 ? ["rgba(250, 204, 21, 0.7)"] : []),
    "rgba(239, 68, 68, 0.7)",
  ];
  const borderColors = [
    "#22c55e",
    ...(breakeven > 0 ? ["#facc15"] : []),
    "#ef4444",
  ];

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    _winRate: winRate,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
          generateLabels: (chart) => {
            const dataset = chart.data.datasets[0];
            return chart.data.labels.map((label, i) => ({
              text: `${label} (${dataset.data[i]})`,
              fillStyle: dataset.backgroundColor[i],
              strokeStyle: dataset.borderColor[i],
              lineWidth: 1,
              pointStyle: "circle",
              hidden: false,
              index: i,
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
            const total = analytics.totalSells;
            const value = context.parsed;
            const percent = ((value / total) * 100).toFixed(1);
            return [
              ` ${value} trades (${percent}%)`,
              ` Out of ${total} total sells`,
            ];
          },
        },
      },
    },
    cutout: "68%",
  };

  return (
    <div>
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-100 dark:border-green-900/40">
          <p className="text-green-600 dark:text-green-400 text-xs font-medium mb-1">
            Profitable
          </p>
          <p className="text-green-600 dark:text-green-400 font-bold text-2xl">
            {profitable}
          </p>
          <p className="text-green-500 text-xs mt-0.5">
            {analytics.totalSells > 0
              ? ((profitable / analytics.totalSells) * 100).toFixed(1)
              : 0}
            %
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center border border-yellow-100 dark:border-yellow-900/40">
          <p className="text-yellow-600 dark:text-yellow-400 text-xs font-medium mb-1">
            Breakeven
          </p>
          <p className="text-yellow-600 dark:text-yellow-400 font-bold text-2xl">
            {breakeven}
          </p>
          <p className="text-yellow-500 text-xs mt-0.5">
            {analytics.totalSells > 0
              ? ((breakeven / analytics.totalSells) * 100).toFixed(1)
              : 0}
            %
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-100 dark:border-red-900/40">
          <p className="text-red-600 dark:text-red-400 text-xs font-medium mb-1">
            Loss
          </p>
          <p className="text-red-600 dark:text-red-400 font-bold text-2xl">
            {loss}
          </p>
          <p className="text-red-500 text-xs mt-0.5">
            {analytics.totalSells > 0
              ? ((loss / analytics.totalSells) * 100).toFixed(1)
              : 0}
            %
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
            Total Sells
          </p>
          <p className="text-gray-900 dark:text-white font-bold text-2xl">
            {analytics.totalSells}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">trades closed</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "220px" }}>
        <Doughnut
          key={darkMode ? "dark" : "light"}
          data={data}
          options={options}
        />
      </div>
    </div>
  );
};

export default WinLossChart;
