import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buyStock, sellStock, createLimitOrder, getMe } from "../services/api";
import { useNotification } from "../context/NotificationContext";
import { INR_FORMAT } from "../utils/formatINR";

const OrderForm = ({ quote, orderType, onClose, onSuccess }) => {
  const { user, updateFunds } = useAuth();
  const { notify } = useNotification();
  const [tradeType, setTradeType] = useState("delivery");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  // The server may have changed the balance (e.g. an intraday auto
  // square-off), so fetch it fresh whenever the form opens
  useEffect(() => {
    getMe()
      .then((res) => updateFunds(res.data.user.funds))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharesLabel = (n) => `${n} share${Number(n) === 1 ? "" : "s"}`;
  const [error, setError] = useState("");

  // Advanced options — Stop Loss + Target
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");

  const currentPrice = quote?.currentPrice || 0;
  const totalCost =
    tradeType === "intraday"
      ? (currentPrice * (parseInt(quantity) || 0)) / 5
      : currentPrice * (parseInt(quantity) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!quantity || parseInt(quantity) <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    // Validate stop loss and target for buy orders
    if (orderType === "buy" && showAdvanced) {
      if (stopLossPrice && parseFloat(stopLossPrice) >= currentPrice) {
        setError("Stop Loss price must be BELOW current price");
        return;
      }
      if (targetPrice && parseFloat(targetPrice) <= currentPrice) {
        setError("Target price must be ABOVE current price");
        return;
      }
    }

    setLoading(true);
    try {
      let res;
      if (orderType === "buy") {
        res = await buyStock({
          symbol: quote.symbol,
          companyName: quote.companyName,
          quantity: parseInt(quantity),
          orderType: tradeType,
        });

        // Create limit orders if advanced options set. The buy has already
        // gone through, so a rejected stop loss/target is reported, not fatal.
        const limitWarnings = [];
        if (showAdvanced) {
          const legs = [
            ["STOP_LOSS", "Stop loss", stopLossPrice],
            ["TARGET", "Target", targetPrice],
          ];
          for (const [limitType, label, price] of legs) {
            if (!price || parseFloat(price) <= 0) continue;
            try {
              await createLimitOrder({
                symbol: quote.symbol,
                companyName: quote.companyName,
                orderType: tradeType,
                transactionType: "sell",
                limitType,
                triggerPrice: parseFloat(price),
                quantity: parseInt(quantity),
              });
            } catch (err) {
              limitWarnings.push(
                `${label} not set: ${err.response?.data?.message || "please try again"}`,
              );
            }
          }
        }
        limitWarnings.forEach((message) => notify(`⚠️ ${message}`, "error"));

        // The server fills at its own live price, which can be a tick away
        // from the one on screen — report what actually happened.
        const filledAt = res.data.currentPrice ?? currentPrice;
        notify(
          `✅ Bought ${sharesLabel(quantity)} of ${quote.symbol} at ₹${filledAt.toLocaleString("en-IN", INR_FORMAT)} | Total: ₹${(filledAt * parseInt(quantity)).toLocaleString("en-IN", INR_FORMAT)}`,
          "success",
        );
      } else {
        res = await sellStock({
          symbol: quote.symbol,
          companyName: quote.companyName,
          quantity: parseInt(quantity),
          orderType: tradeType,
        });

        const profitLoss = res.data.profitLoss;
        const plText =
          profitLoss >= 0
            ? `P&L: +₹${profitLoss?.toLocaleString("en-IN", INR_FORMAT)}`
            : `P&L: -₹${Math.abs(profitLoss)?.toLocaleString("en-IN", INR_FORMAT)}`;

        const filledAt = res.data.currentPrice ?? currentPrice;
        notify(
          `✅ Sold ${sharesLabel(quantity)} of ${quote.symbol} at ₹${filledAt.toLocaleString("en-IN", INR_FORMAT)} | ${plText}`,
          "success",
        );
      }

      updateFunds(res.data.remainingFunds);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Order failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 w-full sm:max-w-md shadow-2xl max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {orderType === "buy" ? "Buy" : "Sell"} {quote?.symbol}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              {quote?.companyName}
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
          {/* Current Price */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Current Price
              </p>
              <p className="text-gray-900 dark:text-white font-bold text-lg">
                ₹{currentPrice?.toLocaleString("en-IN", INR_FORMAT)}
              </p>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Available Funds
              </p>
              <p className="text-green-500 font-semibold text-sm">
                ₹{user?.funds?.toLocaleString("en-IN", INR_FORMAT)}
              </p>
            </div>
          </div>

          {/* Trade Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTradeType("delivery")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                tradeType === "delivery"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Delivery (CNC)
            </button>
            <button
              onClick={() => setTradeType("intraday")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                tradeType === "intraday"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Intraday (MIS)
            </button>
          </div>

          {/* Info Messages */}
          {tradeType === "intraday" && orderType === "buy" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-2 mb-4">
              <p className="text-yellow-700 dark:text-yellow-400 text-xs">
                ⚡ 5x Leverage — You pay only 20% of total value
              </p>
            </div>
          )}

          {orderType === "sell" && tradeType === "intraday" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-2 mb-4">
              <p className="text-yellow-700 dark:text-yellow-400 text-xs">
                ⚠️ You can only sell intraday positions you opened today
              </p>
            </div>
          )}

          {orderType === "sell" && tradeType === "delivery" && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2 mb-4">
              <p className="text-blue-700 dark:text-blue-400 text-xs">
                ℹ️ You can only sell stocks you own in holdings
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
              <p className="text-red-600 dark:text-red-400 text-sm">
                ❌ {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Quantity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Quantity
              </label>
              <input
                type="number"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError("");
                }}
                min="1"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition"
              />
            </div>

            {/* Order Summary */}
            {quantity > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    Price per share
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    ₹{currentPrice?.toLocaleString("en-IN", INR_FORMAT)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    Quantity
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {quantity}
                  </span>
                </div>
                {tradeType === "intraday" && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Total Value
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      ₹
                      {(currentPrice * parseInt(quantity)).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-gray-700 dark:text-gray-300">
                    {tradeType === "intraday"
                      ? "Margin Required"
                      : "Total Amount"}
                  </span>
                  <span
                    className={
                      orderType === "buy" ? "text-green-500" : "text-red-500"
                    }
                  >
                    ₹{totalCost?.toLocaleString("en-IN", INR_FORMAT)}
                  </span>
                </div>
              </div>
            )}

            {/* Advanced Options — Stop Loss + Target (only for BUY) */}
            {orderType === "buy" && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-green-400 transition"
                >
                  <span>{showAdvanced ? "▼" : "▶"}</span>
                  <span>Advanced — Stop Loss / Target Price (optional)</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Auto-sell when price hits your targets. Checked every
                      minute.
                    </p>

                    {/* Stop Loss */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-red-500 mb-1">
                        🛑 Stop Loss Price (auto-sell if price drops to)
                      </label>
                      <input
                        type="number"
                        placeholder={`e.g. ₹${(currentPrice * 0.95).toFixed(2)} (5% below)`}
                        value={stopLossPrice}
                        onChange={(e) => {
                          setStopLossPrice(e.target.value);
                          setError("");
                        }}
                        min="1"
                        step="0.01"
                        className="w-full bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 transition"
                      />
                    </div>

                    {/* Target */}
                    <div>
                      <label className="block text-xs font-medium text-green-500 mb-1">
                        🎯 Target Price (auto-sell if price rises to)
                      </label>
                      <input
                        type="number"
                        placeholder={`e.g. ₹${(currentPrice * 1.1).toFixed(2)} (10% above)`}
                        value={targetPrice}
                        onChange={(e) => {
                          setTargetPrice(e.target.value);
                          setError("");
                        }}
                        min="1"
                        step="0.01"
                        className="w-full bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 transition"
                      />
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      ⚠️ These are not guaranteed. Price may gap past trigger.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
                orderType === "buy"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {loading
                ? "Processing..."
                : `${orderType === "buy" ? "Buy" : "Sell"} ${quantity || ""} ${
                    quantity > 0 ? "shares" : ""
                  }`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
