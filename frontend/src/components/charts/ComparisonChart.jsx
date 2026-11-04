import { useEffect, useRef, useState } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import { getHistoricalData, searchStocks } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { displaySymbol } from "../../utils/displaySymbol";

const TIME_FILTERS = [
  { label: "1W", interval: "15m", range: "5d" },
  { label: "1M", interval: "1d", range: "1mo" },
  { label: "3M", interval: "1d", range: "3mo" },
  { label: "6M", interval: "1d", range: "6mo" },
  { label: "1Y", interval: "1d", range: "1y" },
  { label: "5Y", interval: "1wk", range: "5y" },
];

const STOCK_COLORS = ["#4ade80", "#60a5fa", "#f97316"];

const truncate = (str, n) => (str.length > n ? str.slice(0, n) + "..." : str);

const getColors = (isDark) => ({
  background: isDark ? "#111827" : "#ffffff",
  text: isDark ? "#9ca3af" : "#374151",
  grid: isDark ? "#1f2937" : "#f3f4f6",
  border: isDark ? "#374151" : "#e5e7eb",
});

const ComparisonChart = ({ symbol, companyName }) => {
  const { darkMode } = useTheme();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRefs = useRef([]);
  const searchRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("1M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stocks, setStocks] = useState([
    { symbol, companyName, color: STOCK_COLORS[0] },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize chart ONCE on mount only
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const colors = getColors(darkMode);

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: {
        borderColor: colors.border,
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []); // ← Empty deps: chart created only ONCE

  // Fetch + auto refresh every 15 minutes
  useEffect(() => {
    if (stocks.length > 0) {
      fetchAllData();
    }

    const interval = setInterval(() => {
      if (stocks.length > 0) fetchAllData();
    }, 900000);

    return () => clearInterval(interval);
  }, [stocks, activeFilter]);

  // Update COLORS ONLY when theme changes — no chart recreation
  useEffect(() => {
    if (!chartRef.current) return;
    const colors = getColors(darkMode);
    chartRef.current.applyOptions({
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: {
        borderColor: colors.border,
      },
      timeScale: {
        borderColor: colors.border,
      },
    });
  }, [darkMode]); // ← Only updates colors, does NOT recreate chart

  // Show time only for 1W filter
  useEffect(() => {
    if (!chartRef.current) return;
    const showTime = activeFilter === "1W";
    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: showTime,
        secondsVisible: false,
      },
    });
  }, [activeFilter]);

  async function fetchAllData() {
    if (!chartRef.current) return;

    try {
      setLoading(true);
      setError("");

      // Remove old series
      seriesRefs.current.forEach((series) => {
        try {
          chartRef.current.removeSeries(series);
        } catch {
          // silent
        }
      });
      seriesRefs.current = [];

      const filter = TIME_FILTERS.find((f) => f.label === activeFilter);

      // Fetch all stocks in parallel
      const results = await Promise.all(
        stocks.map((stock) =>
          getHistoricalData(stock.symbol, filter.interval, filter.range),
        ),
      );

      // Add line series for each stock
      results.forEach((res, index) => {
        const { lineData } = res.data;
        if (!lineData || lineData.length === 0) return;

        const lineSeries = chartRef.current.addSeries(LineSeries, {
          color: stocks[index].color,
          lineWidth: 2,
          title: truncate(stocks[index].companyName, 12),
          priceFormat: {
            type: "custom",
            formatter: (price) => `${price.toFixed(2)}%`,
          },
        });

        lineSeries.setData(lineData);
        seriesRefs.current.push(lineSeries);
      });

      chartRef.current.timeScale().fitContent();

      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      setError("Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await searchStocks(query);
      setSearchResults(res.data.results.slice(0, 8));
      setShowResults(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addStock = (newSymbol, newCompanyName) => {
    if (stocks.length >= 3) return;
    if (stocks.find((s) => s.symbol === newSymbol)) return;

    const color = STOCK_COLORS[stocks.length];
    setStocks((prev) => [
      ...prev,
      { symbol: newSymbol, companyName: newCompanyName, color },
    ]);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const removeStock = (symbolToRemove) => {
    if (symbolToRemove === symbol) return;
    setStocks((prev) => prev.filter((s) => s.symbol !== symbolToRemove));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-gray-900 dark:text-white font-bold text-sm">
              Stock Comparison — % Change
            </h3>
            {lastUpdated && (
              <span className="text-gray-400 text-xs">
                Updated: {lastUpdated}
              </span>
            )}
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.label)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeFilter === filter.label
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Chips + Search */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: stock.color + "20",
              border: `1px solid ${stock.color}`,
              color: stock.color,
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: stock.color }}
            />
            <span title={stock.companyName}>
              {truncate(stock.companyName, 16)}
            </span>
            {stock.symbol !== symbol && (
              <button
                onClick={() => removeStock(stock.symbol)}
                className="ml-1 hover:opacity-70 transition"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* Add Stock Search */}
        {stocks.length < 3 && (
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              placeholder="+ Add stock"
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true);
              }}
              autoComplete="off"
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-green-400 transition w-36 sm:w-52"
            />

            {/* Search Results */}
            {showResults && searchResults.length > 0 && (
              <div
                className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden w-60 sm:w-72"
                style={{ zIndex: 9999, top: "100%" }}
              >
                <p className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  Click to add stock
                </p>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addStock(result.symbol, result.companyName);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                  >
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium text-xs">
                        {result.companyName}
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs">
                        {displaySymbol(result.symbol)}
                      </p>
                    </div>
                    <span className="text-green-400 text-xs font-medium shrink-0 ml-2">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Searching indicator */}
            {searching && (
              <div
                className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 w-36 sm:w-52"
                style={{ zIndex: 9999, top: "100%" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400 text-xs">Searching...</p>
                </div>
              </div>
            )}

            {/* No results */}
            {showResults &&
              !searching &&
              searchQuery.length >= 2 &&
              searchResults.length === 0 && (
                <div
                  className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 w-36 sm:w-52"
                  style={{ zIndex: 9999, top: "100%" }}
                >
                  <p className="text-gray-400 text-xs">No stocks found</p>
                </div>
              )}
          </div>
        )}

        {stocks.length >= 3 && (
          <p className="text-gray-400 text-xs italic">Max 3 stocks reached</p>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10 rounded-xl">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading comparison...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10 rounded-xl">
            <div className="text-center">
              <p className="text-4xl mb-2">📉</p>
              <p className="text-gray-400 text-sm">{error}</p>
              <button
                onClick={fetchAllData}
                className="mt-3 text-green-400 hover:text-green-300 text-xs transition"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {stocks.map((stock) => (
          <div key={stock.symbol} className="flex items-center gap-1.5">
            <div
              className="w-6 h-0.5 rounded shrink-0"
              style={{ backgroundColor: stock.color }}
            />
            <span
              className="text-xs"
              style={{ color: stock.color }}
              title={stock.companyName}
            >
              {truncate(stock.companyName, 14)}
            </span>
          </div>
        ))}
        <button
          onClick={fetchAllData}
          className="ml-auto text-xs text-gray-400 hover:text-green-400 transition flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default ComparisonChart;
