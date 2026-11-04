import { useState, useEffect } from "react";
import { getMarketIndices } from "../services/api";
import {
  subscribeToSymbols,
  unsubscribeFromSymbols,
  onPriceUpdate,
} from "../services/socket";

const formatTime = () =>
  new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const MarketIndices = () => {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  // Initial prices over HTTP, then live updates over the socket
  useEffect(() => {
    let symbols = [];
    let cancelled = false;

    const fetchIndices = async () => {
      try {
        const res = await getMarketIndices();
        if (cancelled) return;
        setIndices(res.data.indices);
        setLastUpdated(formatTime());
        symbols = res.data.indices.map((index) => index.symbol);
        subscribeToSymbols(symbols);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const stopListening = onPriceUpdate((updates) => {
      if (!symbols.some((symbol) => updates[symbol]?.currentPrice)) return;
      setIndices((prev) =>
        prev.map((index) => {
          const update = updates[index.symbol];
          if (!update?.currentPrice) return index;
          return {
            ...index,
            price: update.currentPrice,
            change: update.change,
            changePercent: update.changePercent,
            isPositive: update.change >= 0,
          };
        }),
      );
      setLastUpdated(formatTime());
    });

    fetchIndices();

    return () => {
      cancelled = true;
      stopListening();
      unsubscribeFromSymbols(symbols);
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 animate-pulse flex-shrink-0 w-36"
            >
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (indices.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Scrollable row */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {indices.map((index) => (
          <div
            key={index.symbol}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 shadow-sm flex-shrink-0 min-w-[130px]"
          >
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 truncate">
              {index.name}
            </p>
            {index.price ? (
              <>
                <p className="text-gray-900 dark:text-white font-bold text-sm">
                  {index.price?.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    index.isPositive ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {index.isPositive ? "▲" : "▼"} {index.isPositive ? "+" : ""}
                  {index.changePercent?.toFixed(2)}%
                </p>
              </>
            ) : (
              <p className="text-gray-400 text-xs">Unavailable</p>
            )}
          </div>
        ))}
      </div>
      {lastUpdated && (
        <p className="text-gray-400 text-xs mt-1 text-right">
          Updated: {lastUpdated}
        </p>
      )}
    </div>
  );
};

export default MarketIndices;
