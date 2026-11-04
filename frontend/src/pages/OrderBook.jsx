import { useState, useEffect } from "react";
import { getAllOrders, cancelLimitOrder } from "../services/api";
import { INR_FORMAT } from "../utils/formatINR";

const OrderBook = () => {
  const [limitOrders, setLimitOrders] = useState([]);
  const [executedOrders, setExecutedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const res = await getAllOrders();
      setLimitOrders(res.data.limitOrders || []);
      setExecutedOrders(res.data.executedOrders || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      await cancelLimitOrder(id);
      setLimitOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: "CANCELLED" } : o)),
      );
    } catch {
      // silent
    } finally {
      setCancellingId(null);
    }
  };

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

  const getLimitTypeBadge = (limitType) => {
    if (limitType === "STOP_LOSS") {
      return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
    }
    if (limitType === "TARGET") {
      return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
    }
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
  };

  const getLimitTypeLabel = (limitType) => {
    if (limitType === "STOP_LOSS") return "Stop Loss";
    if (limitType === "TARGET") return "Target";
    return "Limit Buy";
  };

  const getStatusBadge = (status) => {
    if (status === "PENDING")
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
    if (status === "EXECUTED")
      return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
    return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  };

  const pendingOrders = limitOrders.filter((o) => o.status === "PENDING");
  const historyOrders = limitOrders.filter((o) => o.status !== "PENDING");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading orders...</p>
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
            Order Book
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Pending limit orders and trade history
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition"
        >
          🔄 <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex-shrink-0 ${
            activeTab === "pending"
              ? "bg-yellow-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          ⏳ Pending ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex-shrink-0 ${
            activeTab === "history"
              ? "bg-purple-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          📋 Limit Order History ({historyOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("executed")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex-shrink-0 ${
            activeTab === "executed"
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          ✅ All Trades ({executedOrders.length})
        </button>
      </div>

      {/* Pending Limit Orders */}
      {activeTab === "pending" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {pendingOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">⏳</p>
              <p className="text-gray-400 text-lg mb-2">No pending orders</p>
              <p className="text-gray-500 text-sm">
                Set Stop Loss or Target when buying a stock
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-12 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Trigger Price
                </div>
                <div className="col-span-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Qty
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Date
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Action
                </div>
              </div>

              {pendingOrders.map((order) => (
                <div
                  key={order._id}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  {/* Mobile */}
                  <div className="sm:hidden px-4 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">
                          {order.symbol}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {order.companyName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancel(order._id)}
                        disabled={cancellingId === order._id}
                        className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-lg"
                      >
                        {cancellingId === order._id ? "..." : "Cancel"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLimitTypeBadge(order.limitType)}`}
                      >
                        {getLimitTypeLabel(order.limitType)}
                      </span>
                      <span className="text-gray-900 dark:text-white text-xs font-semibold">
                        ₹{order.triggerPrice?.toLocaleString("en-IN", INR_FORMAT)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        Qty: {order.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-12 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <div className="col-span-3">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        {order.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {order.companyName}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLimitTypeBadge(order.limitType)}`}
                      >
                        {getLimitTypeLabel(order.limitType)}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        ₹{order.triggerPrice?.toLocaleString("en-IN", INR_FORMAT)}
                      </p>
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        {order.quantity}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => handleCancel(order._id)}
                        disabled={cancellingId === order._id}
                        className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-200 transition"
                      >
                        {cancellingId === order._id
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Limit Order History */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {historyOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📋</p>
              <p className="text-gray-400 text-lg mb-2">
                No limit order history
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-12 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Trigger
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Executed At
                </div>
                <div className="col-span-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Qty
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Status
                </div>
              </div>

              {historyOrders.map((order) => (
                <div
                  key={order._id}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="sm:hidden px-4 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">
                          {order.symbol}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {order.companyName}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLimitTypeBadge(order.limitType)}`}
                      >
                        {getLimitTypeLabel(order.limitType)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        ₹{order.triggerPrice?.toLocaleString("en-IN", INR_FORMAT)}
                      </span>
                      {order.executedPrice && (
                        <span className="text-green-500 text-xs">
                          → ₹{order.executedPrice?.toLocaleString("en-IN", INR_FORMAT)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:grid grid-cols-12 px-6 py-4">
                    <div className="col-span-3">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        {order.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {order.companyName}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLimitTypeBadge(order.limitType)}`}
                      >
                        {getLimitTypeLabel(order.limitType)}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        ₹{order.triggerPrice?.toLocaleString("en-IN", INR_FORMAT)}
                      </p>
                      {order.executedPrice && (
                        <p className="text-green-500 text-xs">
                          → ₹{order.executedPrice?.toLocaleString("en-IN", INR_FORMAT)}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      {order.executedAt ? (
                        <>
                          <p className="text-gray-900 dark:text-white text-sm">
                            {formatDate(order.executedAt)}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {formatTime(order.executedAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400 text-sm">—</p>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        {order.quantity}
                      </p>
                    </div>
                    <div className="col-span-2 flex justify-end items-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* All Executed Trades */}
      {activeTab === "executed" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {executedOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">✅</p>
              <p className="text-gray-400 text-lg mb-2">No trades yet</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-12 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                  Type
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Price
                </div>
                <div className="col-span-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Qty
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Total
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Date
                </div>
              </div>

              {executedOrders.map((order, index) => (
                <div
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="sm:hidden px-4 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">
                          {order.symbol}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {order.companyName}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.transactionType === "buy"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {order.transactionType.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        ₹{order.price?.toLocaleString("en-IN", INR_FORMAT)}
                      </span>
                      <span className="text-gray-400 text-xs">×</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {order.quantity}
                      </span>
                      <span className="text-gray-400 text-xs">=</span>
                      <span className="text-gray-900 dark:text-white text-xs font-semibold">
                        ₹{order.totalAmount?.toLocaleString("en-IN", INR_FORMAT)}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:grid grid-cols-12 px-6 py-4">
                    <div className="col-span-3">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        {order.symbol}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {order.companyName}
                      </p>
                    </div>
                    <div className="col-span-2 flex justify-center items-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.transactionType === "buy"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {order.transactionType.toUpperCase()}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        ₹{order.price?.toLocaleString("en-IN", INR_FORMAT)}
                      </p>
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        {order.quantity}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-gray-900 dark:text-white text-sm font-semibold">
                        ₹{order.totalAmount?.toLocaleString("en-IN", INR_FORMAT)}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-gray-900 dark:text-white text-sm">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderBook;
