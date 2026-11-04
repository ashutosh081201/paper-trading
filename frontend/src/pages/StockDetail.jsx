import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getQuote, getStockSentiment } from "../services/api";
import {
  subscribeToSymbols,
  unsubscribeFromSymbols,
  onPriceUpdate,
} from "../services/socket";
import OrderForm from "../components/OrderForm";
import CandlestickChart from "../components/charts/CandlestickChart";
import ComparisonChart from "../components/charts/ComparisonChart";
import PriceAlertModal from "../components/PriceAlertModal";
import StockNotes from "../components/StockNotes";
import { displaySymbol } from "../utils/displaySymbol";

const isIndex = (symbol) => symbol?.startsWith("^");

const formatPrice = (symbol, value) => {
  if (value === null || value === undefined) return "—";
  if (isIndex(symbol)) {
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getCircuitType = (quote) => {
  if (!quote || isIndex(quote.symbol)) return null;
  const { changePercent, currentPrice, dayHigh, dayLow } = quote;
  if (changePercent >= 4.5 && dayHigh > 0 && currentPrice >= dayHigh * 0.999)
    return "upper";
  if (changePercent <= -4.5 && dayLow > 0 && currentPrice <= dayLow * 1.001)
    return "lower";
  return null;
};

const SentimentCard = ({ symbol, companyName }) => {
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  const fetchSentiment = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getStockSentiment(symbol, companyName);
      setSentiment(res.data.sentiment);
      setFetched(true);
    } catch {
      setError("Failed to load sentiment");
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (s) => {
    if (s === "Bullish") return "text-green-500";
    if (s === "Bearish") return "text-red-500";
    return "text-yellow-500";
  };
  const getSentimentBg = (s) => {
    if (s === "Bullish")
      return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
    if (s === "Bearish")
      return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
    return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
  };
  const getSentimentEmoji = (s) => {
    if (s === "Bullish") return "📈";
    if (s === "Bearish") return "📉";
    return "➡️";
  };
  const getRiskColor = (r) => {
    if (r === "Low") return "text-green-500";
    if (r === "High") return "text-red-500";
    return "text-yellow-500";
  };
  const getRecommendationColor = (r) => {
    if (r === "Buy") return "bg-green-500";
    if (r === "Sell") return "bg-red-500";
    return "bg-yellow-500";
  };
  const getScoreColor = (score) => {
    if (score >= 60) return "bg-green-500";
    if (score <= 40) return "bg-red-500";
    return "bg-yellow-500";
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-gray-900 dark:text-white font-bold text-sm">
            AI Sentiment Analysis
          </h3>
        </div>
        {!fetched && !loading && (
          <button
            onClick={fetchSentiment}
            className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium"
          >
            Analyse
          </button>
        )}
        {fetched && !loading && (
          <button
            onClick={fetchSentiment}
            className="text-gray-400 hover:text-purple-400 text-xs transition"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      {!fetched && !loading && !error && (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm mb-1">
            Get AI-powered sentiment analysis for {symbol}
          </p>
          <p className="text-gray-500 text-xs">Powered by Google Gemini</p>
        </div>
      )}
      {loading && (
        <div className="text-center py-6">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Analysing {symbol}...</p>
        </div>
      )}
      {error && (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <button
            onClick={fetchSentiment}
            className="text-purple-400 hover:text-purple-300 text-xs transition"
          >
            Try again
          </button>
        </div>
      )}
      {sentiment && !loading && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getSentimentBg(sentiment.sentiment)}`}
            >
              <span className="text-lg">
                {getSentimentEmoji(sentiment.sentiment)}
              </span>
              <span
                className={`font-bold text-sm ${getSentimentColor(sentiment.sentiment)}`}
              >
                {sentiment.sentiment}
              </span>
            </div>
            <span
              className={`text-white text-xs font-bold px-3 py-1.5 rounded-lg ${getRecommendationColor(sentiment.recommendation)}`}
            >
              {sentiment.recommendation}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Risk:{" "}
              <span
                className={`font-semibold ${getRiskColor(sentiment.riskLevel)}`}
              >
                {sentiment.riskLevel}
              </span>
            </span>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                Sentiment Score
              </span>
              <span className="text-gray-900 dark:text-white text-xs font-bold">
                {sentiment.score}/100
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${getScoreColor(sentiment.score)}`}
                style={{ width: `${sentiment.score}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-red-400">Bearish</span>
              <span className="text-xs text-yellow-400">Neutral</span>
              <span className="text-xs text-green-400">Bullish</span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3">
            <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
              {sentiment.summary}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Key Factors
            </p>
            <div>
              {sentiment.reasons.map((reason, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 mb-1.5 last:mb-0"
                >
                  <span className="text-purple-400 text-xs mt-0.5 flex-shrink-0">
                    •
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                    {reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-3 text-center">
            ⚠️ AI analysis only — not financial advice
          </p>
        </div>
      )}
    </div>
  );
};

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderType, setOrderType] = useState("buy");
  const [chartMode, setChartMode] = useState("candlestick");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [symbol]);

  // ── Socket: subscribe to this symbol for live price ──
  useEffect(() => {
    if (!symbol) return;

    subscribeToSymbols([symbol]);

    const cleanup = onPriceUpdate((updates) => {
      const update = updates[symbol.toUpperCase()];
      if (!update) return;

      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentPrice: update.currentPrice,
          change: update.change,
          changePercent: update.changePercent,
          dayHigh: Math.max(prev.dayHigh || 0, update.dayHigh || 0),
          dayLow: prev.dayLow
            ? Math.min(prev.dayLow, update.dayLow || prev.dayLow)
            : update.dayLow,
          volume: update.volume || prev.volume,
        };
      });

      // Flash live indicator
      setLiveIndicator(true);
      setTimeout(() => setLiveIndicator(false), 1000);
    });

    return () => {
      cleanup();
      unsubscribeFromSymbols([symbol]);
    };
  }, [symbol]);

  async function fetchQuote() {
    try {
      setLoading(true);
      const res = await getQuote(symbol);
      setQuote(res.data.quote);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const handleBuy = () => {
    setOrderType("buy");
    setShowOrderForm(true);
  };
  const handleSell = () => {
    setOrderType("sell");
    setShowOrderForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stock data...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Stock not found</p>
          <button
            onClick={() => navigate("/stocks")}
            className="mt-4 text-green-400 hover:text-green-300"
          >
            Back to Stocks
          </button>
        </div>
      </div>
    );
  }

  const idx = isIndex(quote.symbol);
  const isPositive = quote.change >= 0;
  const circuitType = getCircuitType(quote);

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
      <button
        onClick={() => navigate("/stocks")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4 sm:mb-6 text-sm"
      >
        ← <span className="hidden sm:inline">Back to Stocks</span>
        <span className="sm:hidden">Back</span>
      </button>

      {/* Stock Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {quote.companyName}
              </h1>
              {idx && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                  Index
                </span>
              )}
              {quote.sector && !idx && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                  {quote.sector}
                </span>
              )}
              {/* Live indicator */}
              {liveIndicator && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium animate-pulse">
                  🔴 LIVE
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
              {displaySymbol(quote.symbol)}
            </p>
            {idx && (
              <p className="text-blue-500 text-xs mt-1">
                📊 Market Index — View Only
              </p>
            )}
            {circuitType === "upper" && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 px-2 py-1 rounded-lg font-bold animate-pulse">
                  🟢 UPPER CIRCUIT
                </span>
                <span className="text-xs text-gray-400">
                  Buyers only — no sellers available
                </span>
              </div>
            )}
            {circuitType === "lower" && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 px-2 py-1 rounded-lg font-bold animate-pulse">
                  🔴 LOWER CIRCUIT
                </span>
                <span className="text-xs text-gray-400">
                  Sellers only — no buyers available
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {!idx && (
              <button
                onClick={() => setShowAlertModal(true)}
                className="text-yellow-400 hover:text-yellow-300 transition text-sm bg-yellow-100 dark:bg-yellow-900/30 px-2 sm:px-3 py-1.5 rounded-lg"
              >
                🔔 <span className="hidden sm:inline">Alert</span>
              </button>
            )}
            <button
              onClick={fetchQuote}
              className="text-gray-400 hover:text-white transition text-sm bg-gray-100 dark:bg-gray-800 px-2 sm:px-3 py-1.5 rounded-lg"
            >
              🔄 <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="mt-3 sm:mt-4">
          <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white transition-all duration-300">
            {formatPrice(quote.symbol, quote.currentPrice)}
          </p>
          <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
            <span
              className={`text-base sm:text-lg font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}
            >
              {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}
              {quote.change?.toFixed(2)}
            </span>
            <span
              className={`text-xs sm:text-sm px-2 py-0.5 rounded-full font-medium ${
                isPositive
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {quote.changePercent?.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stock Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Previous Close
          </p>
          <p className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base">
            {formatPrice(quote.symbol, quote.previousClose)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Day High
          </p>
          <p className="text-green-500 font-semibold text-sm sm:text-base">
            {formatPrice(quote.symbol, quote.dayHigh)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Day Low
          </p>
          <p className="text-red-500 font-semibold text-sm sm:text-base">
            {formatPrice(quote.symbol, quote.dayLow)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Volume
          </p>
          <p className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base">
            {quote.volume?.toLocaleString("en-IN") || "—"}
          </p>
        </div>
        {quote.weekHigh52 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              52W High
            </p>
            <p className="text-green-500 font-semibold text-sm sm:text-base">
              {formatPrice(quote.symbol, quote.weekHigh52)}
            </p>
          </div>
        )}
        {quote.weekLow52 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              52W Low
            </p>
            <p className="text-red-500 font-semibold text-sm sm:text-base">
              {formatPrice(quote.symbol, quote.weekLow52)}
            </p>
          </div>
        )}
        {quote.marketCap && !idx && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Market Cap
            </p>
            <p className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base">
              {quote.marketCap}
            </p>
          </div>
        )}
        {quote.peRatio && !idx && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              P/E Ratio
            </p>
            <p className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base">
              {quote.peRatio}x
            </p>
          </div>
        )}
      </div>

      {!idx && (
        <SentimentCard symbol={quote.symbol} companyName={quote.companyName} />
      )}

      {/* Chart Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setChartMode("candlestick")}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
            chartMode === "candlestick"
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          📈 Candlestick
        </button>
        <button
          onClick={() => setChartMode("comparison")}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
            chartMode === "comparison"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          🔀 <span className="hidden sm:inline">Compare</span>
          <span className="sm:hidden">Compare</span>
        </button>
      </div>

      <div className="mb-4">
        {chartMode === "candlestick" && (
          <CandlestickChart
            symbol={quote.symbol}
            companyName={quote.companyName}
          />
        )}
        {chartMode === "comparison" && (
          <ComparisonChart
            symbol={quote.symbol}
            companyName={quote.companyName}
          />
        )}
      </div>

      {!idx && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          <button
            onClick={handleBuy}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 sm:py-4 rounded-xl transition text-base sm:text-lg"
          >
            Buy
          </button>
          <button
            onClick={handleSell}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 sm:py-4 rounded-xl transition text-base sm:text-lg"
          >
            Sell
          </button>
        </div>
      )}

      {!idx && (
        <StockNotes symbol={quote.symbol} companyName={quote.companyName} />
      )}

      {showOrderForm && (
        <OrderForm
          quote={quote}
          orderType={orderType}
          onClose={() => setShowOrderForm(false)}
          onSuccess={() => {
            setShowOrderForm(false);
            fetchQuote();
          }}
        />
      )}

      {showAlertModal && (
        <PriceAlertModal
          quote={quote}
          onClose={() => setShowAlertModal(false)}
        />
      )}
    </div>
  );
};

export default StockDetail;
