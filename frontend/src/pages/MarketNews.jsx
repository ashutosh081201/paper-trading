import { useState, useEffect } from "react";
import { getMarketNews } from "../services/api";

const MarketNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNews();
  }, []);

  async function fetchNews() {
    try {
      setLoading(true);
      setError("");
      const res = await getMarketNews();
      setNews(res.data.articles);
    } catch {
      setError("Failed to load market news");
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (str, n) => {
    if (!str) return "";
    return str.length > n ? str.slice(0, n) + "..." : str;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Market News
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Latest Indian stock market & financial news
          </p>
        </div>
        <div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm animate-pulse mb-3"
            >
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || news.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Market News
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Latest Indian stock market & financial news
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">📰</p>
          <p className="text-gray-400 text-lg mb-2">
            {error || "No news available"}
          </p>
          <button
            onClick={fetchNews}
            className="mt-3 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Market News
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Latest Indian stock market & financial news
          </p>
        </div>
        <button
          onClick={fetchNews}
          className="bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition"
        >
          🔄 <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* News List */}
      <div>
        {news.map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:border-green-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition group mb-3 last:mb-0"
          >
            {article.urlToImage ? (
              <img
                src={article.urlToImage}
                alt=""
                onError={(e) => {
                  e.target.style.display = "none";
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📰</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white text-sm font-semibold leading-snug group-hover:text-green-500 transition">
                {article.title}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                {truncate(article.description, 120)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                  {article.source}
                </span>
                <span className="text-gray-400 text-xs">
                  {formatDate(article.publishedAt)}
                </span>
                <span className="text-gray-400 text-xs hidden sm:inline">
                  {formatTime(article.publishedAt)}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default MarketNews;