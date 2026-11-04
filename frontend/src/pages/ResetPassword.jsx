import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resetPassword } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const email = location.state?.email || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.otp || !formData.newPassword || !formData.confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (formData.otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({
        email,
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      setSuccess(res.data.message);
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 py-8 ${
        darkMode ? "bg-gray-950" : "bg-gray-50"
      }`}
    >
      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4">
        <button
          onClick={toggleTheme}
          className={`border px-3 sm:px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
            darkMode
              ? "bg-gray-800 hover:bg-gray-700 border-gray-700 text-white"
              : "bg-white hover:bg-gray-100 border-gray-300 text-gray-800"
          }`}
        >
          <span>{darkMode ? "☀️" : "🌙"}</span>
          <span className="hidden sm:inline">
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Header — Logo is clickable */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className={`text-3xl font-bold hover:opacity-80 transition ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Stock<span className="text-green-400">Lab</span>
          </Link>
          <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Set a new password
          </p>
        </div>

        {/* Form */}
        <div
          className={`border rounded-2xl p-6 sm:p-8 ${
            darkMode
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <h2
            className={`text-xl font-bold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Reset Password
          </h2>

          <p
            className={`text-sm mb-6 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            OTP sent to{" "}
            <span className="text-green-400 font-medium">{email}</span>
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
              <p className="text-red-600 dark:text-red-400 text-sm">
                ❌ {error}
              </p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 mb-4">
              <p className="text-green-600 dark:text-green-400 text-sm">
                ✅ {success}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Enter OTP
              </label>
              <input
                type="text"
                name="otp"
                placeholder="Enter 6 digit OTP"
                value={formData.otp}
                onChange={(e) => {
                  setFormData({ ...formData, otp: e.target.value });
                  setError("");
                }}
                maxLength={6}
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition tracking-widest text-center text-lg ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                placeholder="Min 6 characters"
                value={formData.newPassword}
                onChange={(e) => {
                  setFormData({ ...formData, newPassword: e.target.value });
                  setError("");
                }}
                autoComplete="new-password"
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  });
                  setError("");
                }}
                autoComplete="new-password"
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p
            className={`text-center text-sm mt-6 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Remember your password?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-green-400 hover:text-green-300 font-medium cursor-pointer"
            >
              Login
            </span>
          </p>
        </div>

        {/* Footer */}
        <p
          className={`text-center text-sm mt-6 ${
            darkMode ? "text-gray-300" : "text-gray-500"
          }`}
        >
          Made with <span className="text-red-400 text-base">❤️</span> by{" "}
          <span className="text-green-400 font-bold tracking-wide">
            Ashutosh
          </span>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
