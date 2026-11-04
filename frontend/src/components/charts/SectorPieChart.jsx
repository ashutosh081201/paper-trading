import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useTheme } from "../../context/ThemeContext";
import { NIFTY500_SYMBOLS } from "../../data/stocks";
import { INR_FORMAT } from "../../utils/formatINR";

ChartJS.register(ArcElement, Tooltip, Legend);

const SECTOR_COLORS = {
  IT: "#60a5fa",
  Banking: "#4ade80",
  Pharma: "#f97316",
  FMCG: "#a78bfa",
  Auto: "#f43f5e",
  Finance: "#34d399",
  Energy: "#fbbf24",
  Metal: "#94a3b8",
  Power: "#38bdf8",
  Chemicals: "#e879f9",
  Infrastructure: "#fb923c",
  Consumer: "#86efac",
  "Capital Goods": "#c084fc",
  Healthcare: "#f87171",
  Realty: "#67e8f9",
  Defence: "#fde68a",
  Insurance: "#6ee7b7",
  Telecom: "#93c5fd",
  Cement: "#d1d5db",
  Conglomerate: "#fdba74",
  Other: "#9ca3af",
};

const SectorPieChart = ({ holdings }) => {
  const { darkMode } = useTheme();

  if (!holdings || holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No holdings data</p>
      </div>
    );
  }

  // Map holdings to sectors
  const sectorMap = {};

  holdings.forEach((holding) => {
    const stockInfo = NIFTY500_SYMBOLS.find(
      (s) => s.symbol === holding.symbol
    );
    const sector = stockInfo?.sector || "Other";
    const value = holding.currentValue || 0;

    if (sectorMap[sector]) {
      sectorMap[sector].value += value;
      sectorMap[sector].stocks.push(holding.symbol);
    } else {
      sectorMap[sector] = {
        value,
        stocks: [holding.symbol],
      };
    }
  });

  const totalValue = Object.values(sectorMap).reduce(
    (sum, s) => sum + s.value,
    0
  );

  // Sort by value descending
  const sectors = Object.entries(sectorMap)
    .sort((a, b) => b[1].value - a[1].value)
    .map(([name, data]) => ({
      name,
      value: data.value,
      stocks: data.stocks,
      percent: parseFloat(((data.value / totalValue) * 100).toFixed(1)),
    }));

  const data = {
    labels: sectors.map((s) => s.name),
    datasets: [
      {
        data: sectors.map((s) => s.percent),
        backgroundColor: sectors.map(
          (s) =>
            (SECTOR_COLORS[s.name] || SECTOR_COLORS["Other"]) + "cc"
        ),
        borderColor: sectors.map(
          (s) => SECTOR_COLORS[s.name] || SECTOR_COLORS["Other"]
        ),
        borderWidth: 1.5,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: darkMode ? "#e5e7eb" : "#374151",
          font: { size: 11 },
          padding: 10,
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
            const sector = sectors[context.dataIndex];
            return [
              ` ${sector.percent}% of portfolio`,
              ` Value: ₹${sector.value?.toLocaleString("en-IN", INR_FORMAT)}`,
              ` Stocks: ${sector.stocks.join(", ")}`,
            ];
          },
        },
      },
    },
    cutout: "60%",
  };

  return (
    <div>
      {/* Sector summary chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sectors.map((sector) => (
          <div
            key={sector.name}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor:
                (SECTOR_COLORS[sector.name] || SECTOR_COLORS["Other"]) +
                "20",
              border: `1px solid ${
                SECTOR_COLORS[sector.name] || SECTOR_COLORS["Other"]
              }`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  SECTOR_COLORS[sector.name] || SECTOR_COLORS["Other"],
              }}
            />
            <span
              style={{
                color:
                  SECTOR_COLORS[sector.name] || SECTOR_COLORS["Other"],
              }}
            >
              {sector.name} {sector.percent}%
            </span>
          </div>
        ))}
      </div>

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

export default SectorPieChart;