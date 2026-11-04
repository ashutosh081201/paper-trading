import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Login = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const res = await login(formData);
      loginUser(res.data.user, res.data.token);
      navigate("/stocks");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
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
            Welcome back
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
            className={`text-xl font-bold mb-6 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Login
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
              <p className="text-red-600 dark:text-red-400 text-sm">
                ❌ {error}
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
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                autoComplete="email"
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
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                autoComplete="current-password"
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
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition mt-2"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-center mt-4">
            <Link
              to="/forgot-password"
              className="text-green-400 hover:text-green-300 text-sm"
            >
              Forgot Password?
            </Link>
          </p>

          <p
            className={`text-center text-sm mt-3 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-green-400 hover:text-green-300 font-medium"
            >
              Sign Up
            </Link>
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

export default Login;
