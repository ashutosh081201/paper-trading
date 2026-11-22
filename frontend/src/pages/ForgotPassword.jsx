import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isChangePassword = location.state?.changePassword || false;
  // Changing password while signed in: start with the account's email
  const [email, setEmail] = useState(() =>
    isChangePassword && user?.email ? user.email : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      setSuccess(res.data.message);
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
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
            {isChangePassword ? "Change your password" : "Reset your password"}
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
            {isChangePassword ? "Change Password" : "Forgot Password"}
          </h2>

          <p
            className={`text-sm mb-6 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {isChangePassword
              ? `OTP will be sent to ${user?.email}`
              : "Enter your registered email and we'll send you an OTP"}
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
            {!isChangePassword && (
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  autoComplete="email"
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            )}

            {isChangePassword && (
              <div
                className={`rounded-lg px-4 py-3 border ${
                  darkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <p
                  className={`text-xs mb-0.5 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Sending OTP to
                </p>
                <p className="text-green-400 font-medium text-sm">
                  {user?.email}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>

          <p
            className={`text-center text-sm mt-6 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {isChangePassword ? (
              <span
                onClick={() => navigate(-1)}
                className="text-green-400 hover:text-green-300 font-medium cursor-pointer"
              >
                ← Go back
              </span>
            ) : (
              <>
                Remember your password?{" "}
                <span
                  onClick={() => navigate("/login")}
                  className="text-green-400 hover:text-green-300 font-medium cursor-pointer"
                >
                  Login
                </span>
              </>
            )}
          </p>
        </div>

        {/* Footer (signed-in pages already get the app footer) */}
        {!user && (
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
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
