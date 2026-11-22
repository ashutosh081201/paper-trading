import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MarketIndices from "../components/MarketIndices";
import WatchlistPickerModal from "../components/WatchlistPickerModal";
import {
  getAllStocks,
  searchStocks,
  getAllWatchlists,
  addToWatchlistById,
} from "../services/api";
import { useNotification } from "../context/NotificationContext";
import { displaySymbol } from "../utils/displaySymbol";

const MAX_HISTORY = 5;
const HISTORY_KEY = "stocklab_search_history";
const STOCKS_PER_PAGE = 20;

const StockList = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [allWatchlists, setAllWatchlists] = useState([]);
  const [pickerStock, setPickerStock] = useState(null);


  // Back to page 1 whenever the filtered list changes
  const [pagedList, setPagedList] = useState(filteredStocks);
  if (pagedList !== filteredStocks) {
    setPagedList(filteredStocks);
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(filteredStocks.length / STOCKS_PER_PAGE);
  const paginatedStocks = filteredStocks.slice(
    (currentPage - 1) * STOCKS_PER_PAGE,
    currentPage * STOCKS_PER_PAGE,
  );

  function loadHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch {
      setSearchHistory([]);
    }
  }

  useEffect(() => {
    fetchData();
    loadHistory();
  }, []);

  const saveToHistory = (symbol, companyName) => {
    try {
      const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const filtered = existing.filter((h) => h.symbol !== symbol);
      const updated = [{ symbol, companyName }, ...filtered].slice(
        0,
        MAX_HISTORY,
      );
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch {
      // silent
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setSearchHistory([]);
  };

  const deleteHistoryItem = (e, symbol) => {
    e.stopPropagation();
    try {
      const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const updated = existing.filter((h) => h.symbol !== symbol);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch {
      // silent
    }
  };

  async function fetchData() {
    try {
      setLoading(true);
      const [stocksRes, allWatchlistsRes] = await Promise.all([
        getAllStocks(),
        getAllWatchlists(),
      ]);
      setStocks(stocksRes.data.stocks);
      setFilteredStocks(stocksRes.data.stocks);
      setAllWatchlists(allWatchlistsRes.data.watchlists || []);
    } catch (err) {
      notify(err.response?.data?.message || "Couldn't load stocks. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowHistory(false);

    if (query.length === 0) {
      setFilteredStocks(stocks);
      setSearchResults([]);
      return;
    }

    const filtered = stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.companyName.toLowerCase().includes(query.toLowerCase()),
    );
    setFilteredStocks(filtered);

    if (query.length >= 2) {
      setSearching(true);
      try {
        const res = await searchStocks(query);
        setSearchResults(res.data.results.slice(0, 5));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleStockClick = (symbol, companyName) => {
    saveToHistory(symbol, companyName);
    setSearchQuery("");
    setSearchResults([]);
    setShowHistory(false);
    navigate(`/stocks/${symbol}`);
  };

  const handleAddToWatchlist = (e, symbol, companyName) => {
    e.stopPropagation();
    if (allWatchlists.length <= 1) {
      const wl = allWatchlists[0];
      if (!wl) return;
      if (wl.count >= 20) {
        notify("Watchlist is full. Maximum 20 stocks allowed.", "error");
        return;
      }
      doAdd(wl._id, wl.name, symbol, companyName);
      return;
    }
    setPickerStock({ symbol, companyName });
  };

  const doAdd = async (watchlistId, watchlistName, symbol, companyName) => {
    setAddingSymbol(symbol);
    try {
      await addToWatchlistById(watchlistId, { symbol, companyName });
      setAllWatchlists((prev) =>
        prev.map((w) =>
          w._id === watchlistId
            ? {
                ...w,
                count: w.count + 1,
                symbols: [...(w.symbols || []), symbol.toUpperCase()],
              }
            : w,
        ),
      );
      notify(`${displaySymbol(symbol)} added to "${watchlistName}"`, "success");
    } catch (error) {
      notify(error.response?.data?.message || "Failed to add", "error");
    } finally {
      setAddingSymbol(null);
    }
  };

  const handlePickerSelect = (watchlistId, watchlistName) => {
    if (!pickerStock) return;
    const { symbol, companyName } = pickerStock;
    setPickerStock(null);
    doAdd(watchlistId, watchlistName, symbol, companyName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
      {/* Market Indices Widget */}
      <MarketIndices />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Stock List
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            {stocks.length} stocks & indices • Watchlists:{" "}
            <span className="text-green-400">{allWatchlists.length}</span>
          </p>
        </div>
        <button
          onClick={() => navigate("/watchlist")}
          className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-1 sm:gap-2"
        >
          <span>⭐</span>
          <span className="hidden sm:inline">My Watchlists</span>
          <span>({allWatchlists.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-2">
        <input
          type="text"
          name="stock_search_field"
          placeholder="Search stocks or indices..."
          value={searchQuery}
          onChange={handleSearch}
          onFocus={() => {
            if (searchQuery.length === 0) setShowHistory(true);
          }}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          autoComplete="off"
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition shadow-sm"
        />

        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">Recent searches</p>
              <button
                onClick={clearHistory}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Clear all
              </button>
            </div>
            {searchHistory.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <button
                  className="flex items-center gap-3 flex-1 text-left"
                  onClick={() =>
                    handleStockClick(item.symbol, item.companyName)
                  }
                >
                  <span className="text-gray-400 text-sm">🕐</span>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium text-sm">
                      {item.companyName}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {displaySymbol(item.symbol)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => deleteHistoryItem(e, item.symbol)}
                  className="text-red-400 transition text-lg ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* External Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <p className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
              Results from NSE
            </p>
            {searchResults.map((stock, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <div
                  className="cursor-pointer flex-1"
                  onClick={() =>
                    handleStockClick(stock.symbol, stock.companyName)
                  }
                >
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-white font-medium text-sm">
                      {stock.companyName}
                    </p>
                    {stock.symbol?.startsWith("^") && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        Index
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {displaySymbol(stock.symbol)}
                  </p>
                </div>
                <button
                  onClick={(e) =>
                    handleAddToWatchlist(e, stock.symbol, stock.companyName)
                  }
                  disabled={addingSymbol === stock.symbol}
                  className="text-xs px-3 py-1 rounded-lg font-medium transition bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200"
                >
                  {addingSymbol === stock.symbol ? "..." : "+ Add"}
                </button>
              </div>
            ))}
          </div>
        )}

        {searching && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 px-4 py-3">
            <p className="text-gray-400 text-sm">Searching...</p>
          </div>
        )}
      </div>

      {/* Search History Chips */}
      {searchHistory.length > 0 && searchQuery.length === 0 && (
        <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-wrap">
          <span className="text-gray-400 dark:text-gray-500 text-xs">
            Recent:
          </span>
          {searchHistory.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full pr-1 pl-3 py-1"
            >
              <button
                onClick={() => handleStockClick(item.symbol, item.companyName)}
                className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
              >
                🕐 {item.companyName || item.symbol}
              </button>
              <button
                onClick={(e) => deleteHistoryItem(e, item.symbol)}
                className="text-red-400 transition text-xs ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={clearHistory}
            className="text-xs text-red-400 hover:text-red-300 transition"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Company
          </div>
          <div className="col-span-5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Symbol
          </div>
          <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
            Watchlist
          </div>
        </div>

        {/* Table Rows */}
        {filteredStocks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">No stocks found</p>
            <p className="text-gray-500 text-sm">Try a different search term</p>
          </div>
        ) : (
          paginatedStocks.map((stock, index) => {
            const isIdx = stock.symbol?.startsWith("^");
            return (
              <div
                key={index}
                className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {/* Mobile Row */}
                <div className="sm:hidden flex items-center justify-between px-4 py-3">
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() =>
                      handleStockClick(stock.symbol, stock.companyName)
                    }
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {stock.companyName}
                      </p>
                      {isIdx && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Index
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      {displaySymbol(stock.symbol)}
                    </p>
                  </div>
                  <button
                    onClick={(e) =>
                      handleAddToWatchlist(e, stock.symbol, stock.companyName)
                    }
                    disabled={addingSymbol === stock.symbol}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition flex-shrink-0 ml-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {addingSymbol === stock.symbol ? "..." : "+ Add"}
                  </button>
                </div>

                {/* Desktop Row */}
                <div className="hidden sm:grid grid-cols-12 px-6 py-3">
                  <div
                    className="col-span-5 cursor-pointer"
                    onClick={() =>
                      handleStockClick(stock.symbol, stock.companyName)
                    }
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 dark:text-white font-medium text-sm">
                        {stock.companyName}
                      </p>
                      {isIdx && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                          Index
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="col-span-5 cursor-pointer"
                    onClick={() =>
                      handleStockClick(stock.symbol, stock.companyName)
                    }
                  >
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {displaySymbol(stock.symbol)}
                    </p>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={(e) =>
                        handleAddToWatchlist(e, stock.symbol, stock.companyName)
                      }
                      disabled={addingSymbol === stock.symbol}
                      className="text-xs px-3 py-1 rounded-lg font-medium transition bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {addingSymbol === stock.symbol ? "..." : "+ Add"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredStocks.length > STOCKS_PER_PAGE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            Showing {(currentPage - 1) * STOCKS_PER_PAGE + 1}–
            {Math.min(currentPage * STOCKS_PER_PAGE, filteredStocks.length)} of{" "}
            {filteredStocks.length} stocks
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1,
                )
                .reduce((acc, page, i, arr) => {
                  if (i > 0 && page - arr[i - 1] > 1) acc.push("...");
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={i} className="text-gray-400 text-xs px-1">
                      ...
                    </span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                        currentPage === item
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Watchlist Picker Modal */}
      {pickerStock && (
        <WatchlistPickerModal
          watchlists={allWatchlists}
          symbol={pickerStock.symbol}
          companyName={pickerStock.companyName}
          symbolsByWatchlist={Object.fromEntries(
            allWatchlists.map((w) => [w._id, new Set(w.symbols || [])]),
          )}
          onSelect={handlePickerSelect}
          onClose={() => setPickerStock(null)}
        />
      )}
    </div>
  );
};

export default StockList;
