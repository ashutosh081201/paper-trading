import { useState, useEffect } from "react";
import {
  getAccountSummary,
  addFunds,
  resetAccount,
  deleteAccount,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { INR_FORMAT } from "../utils/formatINR";

const Account = () => {
  const { user, updateFunds, loginUser, logoutUser } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [resetError, setResetError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    try {
      setLoading(true);
      const res = await getAccountSummary();
      setSummary(res.data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  const handleAddFunds = async (e) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!addAmount || parseFloat(addAmount) <= 0) {
      setAddError("Please enter a valid amount");
      return;
    }

    setAddLoading(true);
    try {
      const res = await addFunds({ amount: parseFloat(addAmount) });
      updateFunds(res.data.funds);

      notify(
        `💰 ₹${parseFloat(addAmount).toLocaleString("en-IN", INR_FORMAT)} added to your account`,
        "success",
      );

      setAddSuccess(
        `₹${parseFloat(addAmount).toLocaleString("en-IN", INR_FORMAT)} added successfully`,
      );
      setAddAmount("");
      fetchSummary();
    } catch (error) {
      setAddError(error.response?.data?.message || "Failed to add funds");
    } finally {
      setAddLoading(false);
    }
  };

  const handleReset = async () => {
    setResetError("");
    setResetLoading(true);
    try {
      const res = await resetAccount();
      updateFunds(res.data.funds);
      loginUser({ ...user, funds: res.data.funds });
      setShowResetConfirm(false);
      fetchSummary();
    } catch (error) {
      setResetError(error.response?.data?.message || "Failed to reset account");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await deleteAccount();
      logoutUser();
      navigate("/");
    } catch (error) {
      setDeleteError(
        error.response?.data?.message || "Failed to delete account",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const quickAmounts = [10000, 25000, 50000, 100000];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Account
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          Manage your funds and account settings
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-4 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {summary?.user?.name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">
              {summary?.user?.email}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Member since{" "}
              {new Date(summary?.user?.memberSince).toLocaleDateString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                },
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Available Funds
          </p>
          <p className="text-green-500 font-bold text-sm sm:text-lg truncate">
            ₹{summary?.user?.funds?.toLocaleString("en-IN", INR_FORMAT)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Holdings
          </p>
          <p className="text-gray-900 dark:text-white font-bold text-sm sm:text-lg">
            {summary?.stats?.holdingsCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Open Positions
          </p>
          <p className="text-gray-900 dark:text-white font-bold text-sm sm:text-lg">
            {summary?.stats?.positionsCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Total Trades
          </p>
          <p className="text-gray-900 dark:text-white font-bold text-sm sm:text-lg">
            {summary?.stats?.ordersCount}
          </p>
        </div>
      </div>

      {/* Add Funds */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-4 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Add Funds
        </h3>

        {/* Quick Amount Buttons — 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => {
                setAddAmount(amount.toString());
                setAddError("");
                setAddSuccess("");
              }}
              className={`py-2 rounded-lg text-sm font-medium transition ${
                addAmount === amount.toString()
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              +₹{(amount / 1000).toFixed(0)}K
            </button>
          ))}
        </div>

        {/* Add Error */}
        {addError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-3">
            <p className="text-red-600 dark:text-red-400 text-sm">
              ❌ {addError}
            </p>
          </div>
        )}

        {/* Add Success */}
        {addSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 mb-3">
            <p className="text-green-600 dark:text-green-400 text-sm">
              ✅ {addSuccess}
            </p>
          </div>
        )}

        <form
          onSubmit={handleAddFunds}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="number"
            placeholder="Enter custom amount"
            value={addAmount}
            onChange={(e) => {
              setAddAmount(e.target.value);
              setAddError("");
              setAddSuccess("");
            }}
            min="1"
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition"
          />
          <button
            type="submit"
            disabled={addLoading}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-lg transition"
          >
            {addLoading ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      {/* Reset Account */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-orange-200 dark:border-orange-900/50 p-4 sm:p-6 mb-4 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Reset Account
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          This will delete all your holdings, positions, orders and
          transactions. Your funds will be reset to ₹1,00,000.
        </p>

        {resetError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-3">
            <p className="text-red-600 dark:text-red-400 text-sm">
              ❌ {resetError}
            </p>
          </div>
        )}

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-lg transition text-sm"
          >
            Reset Account
          </button>
        ) : (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <p className="text-orange-700 dark:text-orange-400 text-sm font-medium mb-3">
              ⚠️ Are you sure? This will delete all your trading data.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleReset}
                disabled={resetLoading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg transition text-sm"
              >
                {resetLoading ? "Resetting..." : "Yes, Reset"}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold px-5 py-2 rounded-lg transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-4 sm:p-6 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Delete Account
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          This will permanently delete your account and all associated data.
          This action cannot be undone.
        </p>

        {deleteError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-3">
            <p className="text-red-600 dark:text-red-400 text-sm">
              ❌ {deleteError}
            </p>
          </div>
        )}

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-lg transition text-sm"
          >
            Delete Account
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium mb-1">
              ⛔ This action is permanent and cannot be undone.
            </p>
            <p className="text-red-600 dark:text-red-500 text-xs mb-3">
              All your data will be deleted forever.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg transition text-sm"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete Forever"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold px-5 py-2 rounded-lg transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
