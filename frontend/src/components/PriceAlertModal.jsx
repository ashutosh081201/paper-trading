import { useState, useEffect } from "react";
import { createAlert, getAlerts, deleteAlert } from "../services/api";
import { displaySymbol } from "../utils/displaySymbol";

const PriceAlertModal = ({ quote, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      setFetchLoading(true);
      const res = await getAlerts();
      // Filter alerts for this stock only
      const stockAlerts = res.data.alerts.filter(
        (a) => a.symbol === quote.symbol,
      );
      setAlerts(stockAlerts);
    } catch {
      // silent
    } finally {
      setFetchLoading(false);
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      setError("Enter a valid target price");
      return;
    }

    setLoading(true);
    try {
      await createAlert({
        symbol: quote.symbol,
        companyName: quote.companyName,
        targetPrice: parseFloat(targetPrice),
        condition,
      });
      setSuccess("Alert set! You'll receive an email when price is triggered.");
      setTargetPrice("");
      fetchAlerts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch {
      // silent
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 w-full sm:max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              🔔 Price Alert
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              {quote.symbol} — ₹
              {quote.currentPrice?.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4">
          {/* Set Alert Form */}
          <form onSubmit={handleCreate} className="space-y-3 mb-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  ❌ {error}
                </p>
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
                <p className="text-green-600 dark:text-green-400 text-sm">
                  ✅ {success}
                </p>
              </div>
            )}

            {/* Condition Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCondition("above")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                  condition === "above"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                ▲ Above
              </button>
              <button
                type="button"
                onClick={() => setCondition("below")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                  condition === "below"
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                ▼ Below
              </button>
            </div>

            {/* Target Price */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Target Price (₹)
              </label>
              <input
                type="number"
                placeholder={`e.g. ${
                  condition === "above"
                    ? Math.ceil(quote.currentPrice * 1.05)
                    : Math.floor(quote.currentPrice * 0.95)
                }`}
                value={targetPrice}
                onChange={(e) => {
                  setTargetPrice(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                min="1"
                step="0.01"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition"
              />
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
              <p className="text-blue-600 dark:text-blue-400 text-xs">
                📧 You'll receive an email when <strong>{displaySymbol(quote.symbol)}</strong>{" "}
                goes {condition === "above" ? "above" : "below"} ₹
                {targetPrice || "___"}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition text-sm"
            >
              {loading ? "Setting Alert..." : "Set Alert"}
            </button>
          </form>

          {/* Active Alerts for This Stock */}
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
              Active Alerts for {quote.symbol}
            </p>
            {fetchLoading ? (
              <p className="text-gray-400 text-sm text-center py-4">
                Loading...
              </p>
            ) : alerts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                No active alerts for this stock
              </p>
            ) : (
              <div>
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2 last:mb-0"
                  >
                    <div>
                      <p className="text-gray-900 dark:text-white text-sm font-semibold">
                        {alert.condition === "above" ? "▲" : "▼"} ₹
                        {alert.targetPrice?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        Alert when price goes{" "}
                        {alert.condition === "above" ? "above" : "below"} target
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(alert._id)}
                      className="text-red-400 hover:text-red-300 transition text-sm bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceAlertModal;
