import { useState, useEffect, useRef, useMemo } from "react";
import { getHoldings, getPositions, getTransactions } from "../services/api";
import {
  subscribeToSymbols,
  unsubscribeFromSymbols,
  onPriceUpdate,
} from "../services/socket";
import { useNavigate } from "react-router-dom";
import HoldingsPieChart from "../components/charts/HoldingsPieChart";
import PnLBarChart from "../components/charts/PnLBarChart";
import SectorPieChart from "../components/charts/SectorPieChart";
import CumulativePnLChart from "../components/charts/CumulativePnLChart";
import WinLossChart from "../components/charts/WinLossChart";
import MonthlyPnLChart from "../components/charts/MonthlyPnLChart";
import TradeFrequencyChart from "../components/charts/TradeFrequencyChart";
import RiskReturnChart from "../components/charts/RiskReturnChart";
import {
  computeTodayPnL,
  computeXIRR,
  getXIRRLabel,
  computeSectorPerformance,
} from "../utils/portfolioMath";
import { INR_FORMAT } from "../utils/formatINR";

const SECTOR_COLORS = {
  IT: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  Banking:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  Finance:
    "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  Pharma:
    "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  FMCG: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  Auto: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  Energy: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  Metal: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  Infrastructure:
    "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
  Power: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
  Consumer: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
  Healthcare:
    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  Defence:
    "bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
  Realty:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  Chemicals: "bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400",
  Telecom:
    "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
  Cement:
    "bg-stone-100 dark:bg-stone-900/30 text-stone-600 dark:text-stone-400",
  Insurance: "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400",
  Others: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};
const getSectorColor = (sector) =>
  SECTOR_COLORS[sector] || SECTOR_COLORS["Others"];

const Portfolio = () => {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState([]);
  const [positions, setPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [holdingsSummary, setHoldingsSummary] = useState(null);
  const [positionsSummary, setPositionsSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("holdings");
  const [activeChart, setActiveChart] = useState("pie");

  const subscribedSymbolsRef = useRef([]);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 60000);
    return () => {
      clearInterval(interval);
      if (subscribedSymbolsRef.current.length > 0) {
        unsubscribeFromSymbols(subscribedSymbolsRef.current);
      }
    };
  }, []);

  // Socket: listen for price updates → update holdings live
  useEffect(() => {
    const cleanup = onPriceUpdate((updates) => {
      setHoldings((prev) =>
        prev.map((h) => {
          const update = updates[h.symbol.toUpperCase()];
          if (!update) return h;
          const currentPrice = update.currentPrice;
          const currentValue = parseFloat(
            (currentPrice * h.quantity).toFixed(2),
          );
          const profitLoss = parseFloat(
            (currentValue - h.investedAmount).toFixed(2),
          );
          const profitLossPercent = parseFloat(
            ((profitLoss / h.investedAmount) * 100).toFixed(2),
          );
          return {
            ...h,
            currentPrice,
            currentValue,
            profitLoss,
            profitLossPercent,
            dayChange: update.change,
            dayChangePercent: update.changePercent,
          };
        }),
      );
    });
    return cleanup;
  }, []);

  async function fetchPortfolio() {
    try {
      setLoading(true);
      const [holdingsRes, positionsRes, transactionsRes] = await Promise.all([
        getHoldings(),
        getPositions(),
        getTransactions(),
      ]);
      const fetchedHoldings = holdingsRes.data.holdings;
      setHoldings(fetchedHoldings);
      setHoldingsSummary(holdingsRes.data.summary);
      setAnalytics(holdingsRes.data.analytics);
      setPositions(positionsRes.data.positions);
      setPositionsSummary(positionsRes.data.summary);
      setTransactions(transactionsRes.data.transactions);

      // Subscribe to holding symbols for live updates
      if (subscribedSymbolsRef.current.length > 0) {
        unsubscribeFromSymbols(subscribedSymbolsRef.current);
      }
      const symbols = fetchedHoldings.map((h) => h.symbol);
      subscribedSymbolsRef.current = symbols;
      if (symbols.length > 0) {
        subscribeToSymbols(symbols);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // Compute live summary from holdings (auto-updates with socket)
  const computedSummary = useMemo(() => {
    if (!holdings.length) return holdingsSummary;
    const totalInvested = holdings.reduce(
      (sum, h) => sum + (h.investedAmount || 0),
      0,
    );
    const totalCurrentValue = holdings.reduce(
      (sum, h) => sum + (h.currentValue || 0),
      0,
    );
    const totalProfitLoss = parseFloat(
      (totalCurrentValue - totalInvested).toFixed(2),
    );
    const totalProfitLossPercent =
      totalInvested > 0
        ? parseFloat(((totalProfitLoss / totalInvested) * 100).toFixed(2))
        : 0;
    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercent,
    };
  }, [holdings, holdingsSummary]);

  const todayPnL = computeTodayPnL(holdings);
  const xirr = computeXIRR(transactions, holdings);
  const xirrMeta = xirr !== null ? getXIRRLabel(xirr) : null;
  const sectorPerformance = computeSectorPerformance(holdings);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolio...</p>
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
            Portfolio
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              Your holdings and positions
            </p>
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium animate-pulse">
              🔴 LIVE
            </span>
          </div>
        </div>
        <button
          onClick={fetchPortfolio}
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-3 sm:px-4 py-2 rounded-lg transition"
        >
          🔄 <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Holdings Summary — uses computedSummary for live updates */}
      {activeTab === "holdings" && computedSummary && holdings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Total Invested
            </p>
            <p className="text-gray-900 dark:text-white font-bold text-sm sm:text-lg truncate">
              ₹
              {computedSummary.totalInvested?.toLocaleString(
                "en-IN",
                INR_FORMAT,
              )}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Current Value
            </p>
            <p className="text-gray-900 dark:text-white font-bold text-sm sm:text-lg truncate">
              ₹
              {computedSummary.totalCurrentValue?.toLocaleString(
                "en-IN",
                INR_FORMAT,
              )}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Total P&L
            </p>
            <p
              className={`font-bold text-sm sm:text-lg truncate ${computedSummary.totalProfitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {computedSummary.totalProfitLoss >= 0 ? "+" : ""}₹
              {computedSummary.totalProfitLoss?.toLocaleString(
                "en-IN",
                INR_FORMAT,
              )}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Total Return
            </p>
            <p
              className={`font-bold text-sm sm:text-lg ${computedSummary.totalProfitLossPercent >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {computedSummary.totalProfitLossPercent >= 0 ? "+" : ""}
              {computedSummary.totalProfitLossPercent?.toFixed(2)}%
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Today's P&L
            </p>
            <p
              className={`font-bold text-sm sm:text-lg truncate ${todayPnL >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {todayPnL >= 0 ? "+" : ""}₹
              {todayPnL.toLocaleString("en-IN", INR_FORMAT)}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">Live via socket</p>
          </div>
        </div>
      )}

      {/* Positions Summary */}
      {activeTab === "positions" &&
        positionsSummary &&
        positions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                Total Value
              </p>
              <p className="text-gray-900 dark:text-white font-bold text-sm sm:text-lg truncate">
                ₹
                {positionsSummary.totalCurrentValue?.toLocaleString(
                  "en-IN",
                  INR_FORMAT,
                )}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                Intraday P&L
              </p>
              <p
                className={`font-bold text-sm sm:text-lg truncate ${positionsSummary.totalProfitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {positionsSummary.totalProfitLoss >= 0 ? "+" : ""}₹
                {positionsSummary.totalProfitLoss?.toLocaleString(
                  "en-IN",
                  INR_FORMAT,
                )}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                Margin Used
              </p>
              <p className="text-yellow-500 font-bold text-sm sm:text-lg truncate">
                ₹
                {positionsSummary.totalMarginUsed?.toLocaleString(
                  "en-IN",
                  INR_FORMAT,
                )}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                Today's P&L
              </p>
              <p
                className={`font-bold text-sm sm:text-lg truncate ${todayPnL >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {todayPnL >= 0 ? "+" : ""}₹
                {todayPnL.toLocaleString("en-IN", INR_FORMAT)}
              </p>
            </div>
          </div>
        )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          {
            key: "holdings",
            label: `Holdings (${holdings.length})`,
            color: "bg-blue-500",
          },
          {
            key: "positions",
            label: `Positions (${positions.length})`,
            color: "bg-yellow-500",
          },
          { key: "analytics", label: "Analytics 📊", color: "bg-purple-500" },
          { key: "charts", label: "Charts 📈", color: "bg-green-500" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex-shrink-0 ${
              activeTab === tab.key
                ? `${tab.color} text-white`
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Holdings Table */}
      {activeTab === "holdings" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {holdings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-gray-400 text-lg mb-2">No holdings yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Buy stocks in delivery mode to see them here
              </p>
              <button
                onClick={() => navigate("/stocks")}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm transition"
              >
                Browse Stocks
              </button>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-6 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Qty
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Avg / LTP
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Invested
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  P&L
                </div>
              </div>
              {holdings.map((holding, index) => (
                <div
                  key={index}
                  onClick={() => navigate(`/stocks/${holding.symbol}`)}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition last:border-0"
                >
                  {/* Mobile */}
                  <div className="sm:hidden px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">
                          {holding.symbol}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">
                          {holding.companyName}
                        </p>
                        {holding.dayChange !== 0 && (
                          <p
                            className={`text-xs mt-0.5 ${holding.dayChange >= 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            Day: {holding.dayChange >= 0 ? "+" : ""}
                            {holding.dayChangePercent?.toFixed(2)}%
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p
                          className={`text-sm font-bold ${holding.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {holding.profitLoss >= 0 ? "+" : ""}₹
                          {holding.profitLoss?.toLocaleString(
                            "en-IN",
                            INR_FORMAT,
                          )}
                        </p>
                        <p
                          className={`text-xs ${holding.profitLossPercent >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {holding.profitLossPercent >= 0 ? "+" : ""}
                          {holding.profitLossPercent?.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>Qty: {holding.quantity}</span>
                      <span>
                        Avg: ₹
                        {holding.avgBuyPrice?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </span>
                      <span>
                        LTP: ₹
                        {holding.currentPrice?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </span>
                    </div>
                  </div>
                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-6 px-6 py-4">
                    <div className="col-span-2">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        {holding.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {holding.companyName}
                      </p>
                      {holding.dayChange !== 0 && (
                        <p
                          className={`text-xs mt-0.5 ${holding.dayChange >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          Day: {holding.dayChange >= 0 ? "+" : ""}
                          {holding.dayChangePercent?.toFixed(2)}% (₹
                          {(
                            holding.dayChange * holding.quantity
                          ).toLocaleString("en-IN", INR_FORMAT)}
                          )
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 dark:text-white text-sm font-medium">
                        {holding.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        ₹
                        {holding.avgBuyPrice?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                      <p className="text-gray-900 dark:text-white text-sm font-medium transition-all duration-300">
                        ₹
                        {holding.currentPrice?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        ₹
                        {holding.investedAmount?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold transition-all duration-300 ${holding.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {holding.profitLoss >= 0 ? "+" : ""}₹
                        {holding.profitLoss?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                      <p
                        className={`text-xs ${holding.profitLossPercent >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {holding.profitLossPercent >= 0 ? "+" : ""}
                        {holding.profitLossPercent?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Positions Table */}
      {activeTab === "positions" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {positions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-gray-400 text-lg mb-2">No open positions</p>
              <p className="text-gray-500 text-sm mb-4">
                Buy stocks in intraday mode to see them here
              </p>
              <button
                onClick={() => navigate("/stocks")}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm transition"
              >
                Browse Stocks
              </button>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-6 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Qty
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Buy / LTP
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Margin
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  P&L
                </div>
              </div>
              {positions.map((position, index) => (
                <div
                  key={index}
                  onClick={() => navigate(`/stocks/${position.symbol}`)}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition last:border-0"
                >
                  <div className="sm:hidden px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">
                          {position.symbol}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">
                          {position.companyName}
                        </p>
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Intraday
                        </span>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p
                          className={`text-sm font-bold ${position.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {position.profitLoss >= 0 ? "+" : ""}₹
                          {position.profitLoss?.toLocaleString(
                            "en-IN",
                            INR_FORMAT,
                          )}
                        </p>
                        <p
                          className={`text-xs ${position.profitLossPercent >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {position.profitLossPercent >= 0 ? "+" : ""}
                          {position.profitLossPercent?.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>Qty: {position.quantity}</span>
                      <span>
                        Buy: ₹
                        {position.buyPrice?.toLocaleString("en-IN", INR_FORMAT)}
                      </span>
                      <span className="text-yellow-500">
                        Margin: ₹
                        {position.marginPaid?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:grid grid-cols-6 px-6 py-4">
                    <div className="col-span-2">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        {position.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {position.companyName}
                      </p>
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                        Intraday
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 dark:text-white text-sm font-medium">
                        {position.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        ₹
                        {position.buyPrice?.toLocaleString("en-IN", INR_FORMAT)}
                      </p>
                      <p className="text-gray-900 dark:text-white text-sm font-medium">
                        ₹
                        {position.currentPrice?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-500 text-sm font-medium">
                        ₹
                        {position.marginPaid?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${position.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {position.profitLoss >= 0 ? "+" : ""}₹
                        {position.profitLoss?.toLocaleString(
                          "en-IN",
                          INR_FORMAT,
                        )}
                      </p>
                      <p
                        className={`text-xs ${position.profitLossPercent >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {position.profitLossPercent >= 0 ? "+" : ""}
                        {position.profitLossPercent?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          {!analytics ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center shadow-sm">
              <p className="text-4xl mb-4">📊</p>
              <p className="text-gray-400 text-lg mb-2">No analytics yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Start trading to see your portfolio analytics
              </p>
              <button
                onClick={() => navigate("/stocks")}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm transition"
              >
                Browse Stocks
              </button>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Total Trades
                  </p>
                  <p className="text-gray-900 dark:text-white font-bold text-xl sm:text-2xl">
                    {analytics.totalTrades}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Win Rate
                  </p>
                  <p
                    className={`font-bold text-xl sm:text-2xl ${analytics.winRate >= 50 ? "text-green-500" : "text-red-500"}`}
                  >
                    {analytics.winRate}%
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {analytics.profitableSells}/{analytics.totalSells} sells
                    profitable
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Profitable Sells
                  </p>
                  <p className="text-green-500 font-bold text-xl sm:text-2xl">
                    {analytics.profitableSells}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Total Sells
                  </p>
                  <p className="text-gray-900 dark:text-white font-bold text-xl sm:text-2xl">
                    {analytics.totalSells}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Today's P&L
                  </p>
                  <p
                    className={`font-bold text-xl sm:text-2xl ${todayPnL >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {todayPnL >= 0 ? "+" : ""}₹
                    {todayPnL.toLocaleString("en-IN", INR_FORMAT)}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">Live via socket</p>
                </div>
              </div>

              {/* XIRR Card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📈</span>
                  <div>
                    <p className="text-gray-900 dark:text-white font-bold text-sm">
                      Portfolio XIRR
                    </p>
                    <p className="text-gray-400 text-xs">
                      Annualized return — same metric used by mutual funds
                    </p>
                  </div>
                </div>
                {xirr !== null ? (
                  <div className="flex items-end gap-4 flex-wrap">
                    <div>
                      <p
                        className={`font-bold text-3xl sm:text-4xl ${parseFloat(xirr) >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {parseFloat(xirr) >= 0 ? "+" : ""}
                        {xirr}%
                      </p>
                      <p className="text-gray-400 text-xs mt-1">per annum</p>
                    </div>
                    <div className="mb-1">
                      <span
                        className={`text-sm font-semibold ${xirrMeta?.color}`}
                      >
                        {xirrMeta?.label}
                      </span>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Based on all your trades + current holdings
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">
                      Not enough data to calculate XIRR
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      XIRR appears once your delivery investments span at least
                      30 days (intraday trades aren't included)
                    </p>
                  </div>
                )}
                {xirr !== null && (
                  <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Below 0%</p>
                      <p className="text-xs text-red-400 font-medium">
                        Loss making
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">0% – 15%</p>
                      <p className="text-xs text-yellow-400 font-medium">
                        Market returns
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Above 15%</p>
                      <p className="text-xs text-green-400 font-medium">
                        Outperforming
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-gray-400 text-xs mt-3">
                  ⚠️ Paper trading only — not a real financial metric
                </p>
              </div>

              {/* Sector Performance */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🏭</span>
                  <div>
                    <p className="text-gray-900 dark:text-white font-bold text-sm">
                      Sector-wise Performance
                    </p>
                    <p className="text-gray-400 text-xs">
                      How each sector in your portfolio is performing
                    </p>
                  </div>
                </div>
                {sectorPerformance.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm">
                      No holdings to analyse
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sectorPerformance.map((s) => {
                      const maxAbs = Math.max(
                        ...sectorPerformance.map((x) => Math.abs(x.pnlPercent)),
                      );
                      const barWidth =
                        maxAbs > 0
                          ? Math.min(
                              (Math.abs(s.pnlPercent) / maxAbs) * 100,
                              100,
                            )
                          : 0;
                      return (
                        <div key={s.sector}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getSectorColor(s.sector)}`}
                              >
                                {s.sector}
                              </span>
                              <span className="text-gray-400 text-xs truncate">
                                {s.stocks.slice(0, 3).join(", ")}
                                {s.stocks.length > 3
                                  ? ` +${s.stocks.length - 3}`
                                  : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                              <span className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
                                ₹
                                {s.currentValue.toLocaleString(
                                  "en-IN",
                                  INR_FORMAT,
                                )}
                              </span>
                              <span
                                className={`text-xs font-bold ${s.pnlPercent >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {s.pnlPercent >= 0 ? "+" : ""}
                                {s.pnlPercent}%
                              </span>
                              <span
                                className={`text-xs ${s.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {s.profitLoss >= 0 ? "+" : ""}₹
                                {Math.abs(s.profitLoss).toLocaleString(
                                  "en-IN",
                                  INR_FORMAT,
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${s.pnlPercent >= 0 ? "bg-green-500" : "bg-red-500"}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Sectors</p>
                        <p className="text-gray-900 dark:text-white font-bold text-sm">
                          {sectorPerformance.length}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Best Sector</p>
                        <p className="text-green-500 font-bold text-sm truncate">
                          {sectorPerformance[0]?.sector}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Worst Sector</p>
                        <p className="text-red-400 font-bold text-sm truncate">
                          {
                            sectorPerformance[sectorPerformance.length - 1]
                              ?.sector
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Best + Worst Holdings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🏆</span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Best Holding
                    </p>
                  </div>
                  {analytics.bestHolding ? (
                    <div>
                      <p
                        className="text-gray-900 dark:text-white font-bold text-lg cursor-pointer hover:text-green-400 transition"
                        onClick={() =>
                          navigate(`/stocks/${analytics.bestHolding.symbol}`)
                        }
                      >
                        {analytics.bestHolding.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {analytics.bestHolding.companyName}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <p className="text-green-500 font-bold text-lg">
                          +{analytics.bestHolding.profitLossPercent?.toFixed(2)}
                          %
                        </p>
                        <p className="text-green-500 text-sm">
                          +₹
                          {analytics.bestHolding.profitLoss?.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No data yet</p>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📉</span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Worst Holding
                    </p>
                  </div>
                  {analytics.worstHolding ? (
                    <div>
                      <p
                        className="text-gray-900 dark:text-white font-bold text-lg cursor-pointer hover:text-red-400 transition"
                        onClick={() =>
                          navigate(`/stocks/${analytics.worstHolding.symbol}`)
                        }
                      >
                        {analytics.worstHolding.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {analytics.worstHolding.companyName}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <p
                          className={`font-bold text-lg ${analytics.worstHolding.profitLossPercent >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {analytics.worstHolding.profitLossPercent >= 0
                            ? "+"
                            : ""}
                          {analytics.worstHolding.profitLossPercent?.toFixed(2)}
                          %
                        </p>
                        <p
                          className={`text-sm ${analytics.worstHolding.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {analytics.worstHolding.profitLoss >= 0 ? "+" : ""}₹
                          {analytics.worstHolding.profitLoss?.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No data yet</p>
                  )}
                </div>
              </div>

              {/* Most Traded */}
              {analytics.mostTraded && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🔥</span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Most Traded Stock
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className="text-gray-900 dark:text-white font-bold text-lg cursor-pointer hover:text-green-400 transition"
                        onClick={() =>
                          navigate(`/stocks/${analytics.mostTraded.symbol}`)
                        }
                      >
                        {analytics.mostTraded.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        Traded {analytics.mostTraded.count} times
                      </p>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg text-sm font-bold">
                      {analytics.mostTraded.count}x
                    </div>
                  </div>
                </div>
              )}

              {/* Win Rate Bar */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Win Rate Progress
                  </p>
                  <p
                    className={`font-bold ${analytics.winRate >= 50 ? "text-green-500" : "text-red-500"}`}
                  >
                    {analytics.winRate}%
                  </p>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${analytics.winRate >= 50 ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: `${analytics.winRate}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-gray-400 text-xs">0%</p>
                  <p className="text-gray-400 text-xs">50%</p>
                  <p className="text-gray-400 text-xs">100%</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === "charts" && (
        <div className="space-y-4">
          {holdings.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center shadow-sm">
              <p className="text-4xl mb-4">📈</p>
              <p className="text-gray-400 text-lg mb-2">No data to chart</p>
              <p className="text-gray-500 text-sm mb-4">
                Buy stocks to see portfolio charts
              </p>
              <button
                onClick={() => navigate("/stocks")}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm transition"
              >
                Browse Stocks
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { key: "pie", label: "🍩 Allocation", color: "bg-green-500" },
                  {
                    key: "sector",
                    label: "🏭 Sectors",
                    color: "bg-purple-500",
                  },
                  { key: "bar", label: "📊 P&L", color: "bg-blue-500" },
                  {
                    key: "cumulative",
                    label: "📈 Cumulative P&L",
                    color: "bg-orange-500",
                  },
                  { key: "winloss", label: "🎯 Win/Loss", color: "bg-red-500" },
                  {
                    key: "monthly",
                    label: "📅 Monthly P&L",
                    color: "bg-yellow-500",
                  },
                  {
                    key: "frequency",
                    label: "🔁 Trade Frequency",
                    color: "bg-cyan-500",
                  },
                  {
                    key: "riskreturn",
                    label: "⚖️ Risk vs Return",
                    color: "bg-violet-500",
                  },
                ].map((chart) => (
                  <button
                    key={chart.key}
                    onClick={() => setActiveChart(chart.key)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex-shrink-0 ${
                      activeChart === chart.key
                        ? `${chart.color} text-white`
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {chart.label}
                  </button>
                ))}
              </div>
              {activeChart === "pie" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                        Portfolio Allocation
                      </h3>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Distribution by current value
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                      {holdings.length} stocks
                    </span>
                  </div>
                  <HoldingsPieChart holdings={holdings} />
                </div>
              )}
              {activeChart === "sector" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                      Sector Allocation
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Portfolio distribution by sector
                    </p>
                  </div>
                  <SectorPieChart holdings={holdings} />
                </div>
              )}
              {activeChart === "bar" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                        P&L Comparison
                      </h3>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Profit & Loss per holding
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-green-500 opacity-70"></div>
                        <span className="text-xs text-gray-400">Profit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-red-500 opacity-70"></div>
                        <span className="text-xs text-gray-400">Loss</span>
                      </div>
                    </div>
                  </div>
                  <PnLBarChart holdings={holdings} />
                </div>
              )}
              {activeChart === "cumulative" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                      Cumulative P&L
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Running total of realized profits and losses
                    </p>
                  </div>
                  <CumulativePnLChart transactions={transactions} />
                </div>
              )}
              {activeChart === "winloss" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                      Win / Loss Ratio
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Profitable vs loss making sell trades
                    </p>
                  </div>
                  <WinLossChart analytics={analytics} />
                </div>
              )}
              {activeChart === "monthly" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                      Monthly P&L
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Profit & Loss breakdown by month
                    </p>
                  </div>
                  <MonthlyPnLChart transactions={transactions} />
                </div>
              )}
              {activeChart === "frequency" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                      Trade Frequency
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Buy & sell activity over time
                    </p>
                  </div>
                  <TradeFrequencyChart transactions={transactions} />
                </div>
              )}
              {activeChart === "riskreturn" && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm">
                      Risk vs Return
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Compare volatility vs performance across all holdings
                    </p>
                  </div>
                  <RiskReturnChart holdings={holdings} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Portfolio;
