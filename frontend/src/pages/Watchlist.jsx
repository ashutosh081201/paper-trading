import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllWatchlists,
  getWatchlistById,
  createWatchlist,
  deleteWatchlist,
  renameWatchlist,
  removeFromWatchlistById,
} from "../services/api";
import {
  subscribeToSymbols,
  unsubscribeFromSymbols,
  onPriceUpdate,
} from "../services/socket";
import { useNotification } from "../context/NotificationContext";
import { displaySymbol } from "../utils/displaySymbol";
import { INR_FORMAT } from "../utils/formatINR";

const isIndex = (symbol) => symbol?.startsWith("^");

const formatPrice = (symbol, value) => {
  if (!value || value <= 0) return "—";
  if (isIndex(symbol)) {
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return `₹${value.toLocaleString("en-IN", INR_FORMAT)}`;
};

const Watchlist = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [watchlists, setWatchlists] = useState([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState(null);
  const [activeWatchlist, setActiveWatchlist] = useState([]);
  const [activeWatchlistName, setActiveWatchlistName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [removingSymbol, setRemovingSymbol] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const subscribedSymbolsRef = useRef([]);

  // Socket: listen for price updates
  useEffect(() => {
    const cleanup = onPriceUpdate((updates) => {
      setActiveWatchlist((prev) =>
        prev.map((stock) => {
          const update = updates[stock.symbol.toUpperCase()];
          if (!update) return stock;
          return {
            ...stock,
            currentPrice: update.currentPrice,
            change: update.change,
            changePercent: update.changePercent,
            dayHigh: update.dayHigh || stock.dayHigh,
            dayLow: update.dayLow || stock.dayLow,
            volume: update.volume || stock.volume,
          };
        }),
      );
    });
    return cleanup;
  }, []);

  async function fetchAllWatchlists() {
    try {
      setLoading(true);
      const res = await getAllWatchlists();
      const lists = res.data.watchlists || [];
      setWatchlists(lists);
      if (lists.length > 0) {
        setActiveWatchlistId(lists[0]._id);
        await fetchWatchlistStocks(lists[0]._id);
      }
    } catch {
      notify("Failed to fetch watchlists", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllWatchlists();

    // Cleanup socket on unmount
    return () => {
      if (subscribedSymbolsRef.current.length > 0) {
        unsubscribeFromSymbols(subscribedSymbolsRef.current);
      }
    };
  }, []);

  const fetchWatchlistStocks = async (id) => {
    try {
      setLoadingStocks(true);
      const res = await getWatchlistById(id);
      const stocks = res.data.watchlist || [];
      setActiveWatchlist(stocks);
      setActiveWatchlistName(res.data.name || "");

      // Unsubscribe from old, subscribe to new
      if (subscribedSymbolsRef.current.length > 0) {
        unsubscribeFromSymbols(subscribedSymbolsRef.current);
      }
      const symbols = stocks.map((s) => s.symbol);
      subscribedSymbolsRef.current = symbols;
      if (symbols.length > 0) {
        subscribeToSymbols(symbols);
      }
    } catch {
      notify("Failed to fetch watchlist", "error");
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleSwitchWatchlist = async (id) => {
    setActiveWatchlistId(id);
    await fetchWatchlistStocks(id);
  };

  const handleRemove = async (e, symbol) => {
    e.stopPropagation();
    setRemovingSymbol(symbol);
    try {
      await removeFromWatchlistById(activeWatchlistId, symbol);
      setActiveWatchlist((prev) => prev.filter((s) => s.symbol !== symbol));
      setWatchlists((prev) =>
        prev.map((w) =>
          w._id === activeWatchlistId ? { ...w, count: w.count - 1 } : w,
        ),
      );
      unsubscribeFromSymbols([symbol]);
      subscribedSymbolsRef.current = subscribedSymbolsRef.current.filter(
        (s) => s !== symbol,
      );
      notify(`${displaySymbol(symbol)} removed from watchlist`, "success");
    } catch (error) {
      notify(error.response?.data?.message || "Failed to remove", "error");
    } finally {
      setRemovingSymbol(null);
    }
  };

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) return;
    setCreating(true);
    try {
      const res = await createWatchlist({ name: newWatchlistName.trim() });
      const newWL = res.data.watchlist;
      setWatchlists((prev) => [...prev, newWL]);
      setShowCreateModal(false);
      setNewWatchlistName("");
      notify(`"${newWL.name}" created`, "success");
    } catch (error) {
      notify(error.response?.data?.message || "Failed to create", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWatchlist = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteWatchlist(id);
      const remaining = watchlists.filter((w) => w._id !== id);
      setWatchlists(remaining);
      if (activeWatchlistId === id && remaining.length > 0) {
        setActiveWatchlistId(remaining[0]._id);
        await fetchWatchlistStocks(remaining[0]._id);
      }
      notify(`"${name}" deleted`, "success");
    } catch (error) {
      notify(error.response?.data?.message || "Failed to delete", "error");
    }
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) return;
    try {
      await renameWatchlist(id, { name: renameValue.trim() });
      setWatchlists((prev) =>
        prev.map((w) =>
          w._id === id ? { ...w, name: renameValue.trim() } : w,
        ),
      );
      if (activeWatchlistId === id) setActiveWatchlistName(renameValue.trim());
      setRenamingId(null);
      setRenameValue("");
      notify("Watchlist renamed", "success");
    } catch (error) {
      notify(error.response?.data?.message || "Failed to rename", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading watchlists...</p>
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
            My Watchlists
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              {watchlists.length}/5 watchlists
            </p>
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium animate-pulse">
              🔴 LIVE
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchWatchlistStocks(activeWatchlistId)}
            className="bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition"
          >
            🔄 <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate("/stocks")}
            className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition"
          >
            + <span className="hidden sm:inline">Add Stocks</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Watchlist Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {watchlists.map((wl) => (
          <div key={wl._id} className="flex-shrink-0">
            {renamingId === wl._id ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(wl._id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="bg-white dark:bg-gray-800 border border-green-400 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none w-28"
                  autoFocus
                />
                <button
                  onClick={() => handleRename(wl._id)}
                  className="text-green-400 text-xs"
                >
                  ✓
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="text-gray-400 text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSwitchWatchlist(wl._id)}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                    activeWatchlistId === wl._id
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {wl.name}
                  <span className="ml-1 opacity-70">({wl.count})</span>
                </button>
                {activeWatchlistId === wl._id && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        setRenamingId(wl._id);
                        setRenameValue(wl.name);
                      }}
                      className="text-gray-400 hover:text-blue-400 text-xs p-1 rounded transition"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteWatchlist(wl._id, wl.name)}
                      className="text-gray-400 hover:text-red-400 text-xs p-1 rounded transition"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {watchlists.length < 5 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-400 transition"
          >
            + New
          </button>
        )}
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loadingStocks ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">Loading stocks...</p>
          </div>
        ) : activeWatchlist.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">⭐</p>
            <p className="text-gray-400 text-lg mb-2">
              "{activeWatchlistName}" is empty
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Add up to 20 stocks to track their live prices
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
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-12 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stock
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Price
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Change
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                High / Low
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Action
              </div>
            </div>

            {activeWatchlist.map((stock, index) => {
              const idx = isIndex(stock.symbol);
              return (
                <div
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  {/* Mobile */}
                  <div
                    className="sm:hidden px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                    onClick={() => navigate(`/stocks/${stock.symbol}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 dark:text-white font-semibold text-sm">
                            {stock.companyName}
                          </p>
                          {idx && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              Index
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                          {displaySymbol(stock.symbol)}
                        </p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">
                          {formatPrice(stock.symbol, stock.currentPrice)}
                        </p>
                        <p
                          className={`text-xs font-medium mt-0.5 ${stock.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {stock.currentPrice > 0
                            ? `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent?.toFixed(2)}%`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-green-500 text-xs">
                        H: {formatPrice(stock.symbol, stock.dayHigh)}
                      </span>
                      <span className="text-red-500 text-xs">
                        L: {formatPrice(stock.symbol, stock.dayLow)}
                      </span>
                      <div className="ml-auto flex gap-2">
                        {idx ? (
                          <button
                            onClick={() => navigate(`/stocks/${stock.symbol}`)}
                            className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg"
                          >
                            View
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/stocks/${stock.symbol}`)}
                            className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg"
                          >
                            Trade
                          </button>
                        )}
                        <button
                          onClick={(e) => handleRemove(e, stock.symbol)}
                          disabled={removingSymbol === stock.symbol}
                          className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-lg"
                        >
                          {removingSymbol === stock.symbol ? "..." : "✕"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div
                    onClick={() => navigate(`/stocks/${stock.symbol}`)}
                    className="hidden sm:grid grid-cols-12 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
                  >
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">
                          {stock.companyName}
                        </p>
                        {idx && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                            Index
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {displaySymbol(stock.symbol)}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm transition-all duration-300">
                        {formatPrice(stock.symbol, stock.currentPrice)}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p
                        className={`font-semibold text-sm ${stock.change >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {stock.currentPrice > 0
                          ? `${stock.change >= 0 ? "+" : ""}${stock.change?.toFixed(2)}`
                          : "—"}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${stock.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {stock.currentPrice > 0
                          ? `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent?.toFixed(2)}%`
                          : ""}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-green-500 text-xs">
                        H: {formatPrice(stock.symbol, stock.dayHigh)}
                      </p>
                      <p className="text-red-500 text-xs mt-0.5">
                        L: {formatPrice(stock.symbol, stock.dayLow)}
                      </p>
                    </div>
                    <div
                      className="col-span-2 flex justify-end items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {idx ? (
                        <button
                          onClick={() => navigate(`/stocks/${stock.symbol}`)}
                          className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-200 transition"
                        >
                          View
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/stocks/${stock.symbol}`)}
                          className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-200 transition"
                        >
                          Trade
                        </button>
                      )}
                      <button
                        onClick={(e) => handleRemove(e, stock.symbol)}
                        disabled={removingSymbol === stock.symbol}
                        className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-lg hover:bg-red-200 transition"
                      >
                        {removingSymbol === stock.symbol ? "..." : "✕"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Create New Watchlist
            </h2>
            <input
              type="text"
              placeholder="e.g. Banking, IT, Midcap..."
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateWatchlist();
              }}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition mb-4"
              autoFocus
              maxLength={30}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWatchlistName("");
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWatchlist}
                disabled={creating || !newWatchlistName.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-green-500 hover:bg-green-600 text-white transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
