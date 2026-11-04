import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotification } from "../context/NotificationContext";
import { logout } from "../services/api";
import NotificationDropdown from "./NotificationDropdown";
import { INR_FORMAT } from "../utils/formatINR";

const Navbar = () => {
  const { user, logoutUser } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus when the route changes (adjusting state during render,
  // as React recommends, instead of in an effect)
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }

  const handleLogout = async () => {
    try {
      await logout();
      logoutUser();
      navigate("/login");
    } catch {
      console.log("Logout failed");
    }
  };

  return (
    <>
      <nav className="bg-gray-900 dark:bg-gray-950 border-b border-gray-800 px-4 sm:px-6 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/stocks" className="text-xl font-bold text-white">
            Stock<span className="text-green-400">Lab</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/stocks"
              className="text-gray-300 hover:text-white text-sm transition"
            >
              Stocks
            </Link>
            <Link
              to="/watchlist"
              className="text-gray-300 hover:text-white text-sm transition"
            >
              Watchlist
            </Link>
            <Link
              to="/portfolio"
              className="text-gray-300 hover:text-white text-sm transition"
            >
              Portfolio
            </Link>
            <Link
              to="/transactions"
              className="text-gray-300 hover:text-white text-sm transition"
            >
              History
            </Link>
            <Link
              to="/orders"
              className="text-gray-300 hover:text-white text-sm transition"
            >
              Orders
            </Link>
            <Link
              to="/news"
              className="text-gray-300 hover:text-white text-sm transition"
            >
              📰 News
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setDropdownOpen(false);
                }}
                className="relative bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition"
              >
                <span className="text-lg">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <NotificationDropdown onClose={() => setNotifOpen(false)} />
              )}
            </div>

            {/* Profile Dropdown — desktop only */}
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => {
                  setDropdownOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition"
              >
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-white text-sm font-medium hidden md:block">
                  {user?.name}
                </span>
                <span className="text-gray-400 text-xs">
                  {dropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 dark:bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-white font-semibold text-sm">
                      {user?.name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {user?.email}
                    </p>
                    <div className="mt-2 bg-gray-700 rounded-lg px-3 py-1.5">
                      <p className="text-xs text-gray-400">Available Funds</p>
                      <p className="text-green-400 font-bold text-sm">
                        ₹{user?.funds?.toLocaleString("en-IN", INR_FORMAT)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigate("/account");
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm"
                  >
                    <span>💰</span>
                    <span>Add Funds</span>
                  </button>

                  <button
                    onClick={() => {
                      toggleTheme();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm"
                  >
                    <span>{darkMode ? "☀️" : "🌙"}</span>
                    <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate("/forgot-password", {
                        state: { changePassword: true },
                      });
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm"
                  >
                    <span>🔑</span>
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate("/account");
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition text-sm"
                  >
                    <span>👤</span>
                    <span>Account</span>
                  </button>

                  <div className="border-t border-gray-700" />

                  <button
                    onClick={() => {
                      handleLogout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-700 hover:text-red-300 transition text-sm"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 mt-3 pt-3 space-y-1">
            {/* Funds */}
            <div className="flex items-center justify-between px-3 py-2 mb-2 bg-gray-800 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">
                    {user?.name}
                  </p>
                  <p className="text-gray-400 text-xs">{user?.email}</p>
                </div>
              </div>
              <p className="text-green-400 font-bold text-sm">
                ₹{user?.funds?.toLocaleString("en-IN", INR_FORMAT)}
              </p>
            </div>

            {/* Nav Links */}
            {[
              { to: "/stocks", icon: "📈", label: "Stocks" },
              { to: "/watchlist", icon: "⭐", label: "Watchlist" },
              { to: "/portfolio", icon: "💼", label: "Portfolio" },
              { to: "/transactions", icon: "📋", label: "History" },
              { to: "/orders", icon: "📒", label: "Order Book" },
              { to: "/news", icon: "📰", label: "Market News" },
              { to: "/account", icon: "👤", label: "Account" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition text-sm"
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Theme Toggle */}
            <button
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition text-sm"
            >
              <span>{darkMode ? "☀️" : "🌙"}</span>
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Change Password */}
            <button
              onClick={() => {
                navigate("/forgot-password", {
                  state: { changePassword: true },
                });
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition text-sm"
            >
              <span>🔑</span>
              <span>Change Password</span>
            </button>

            <div className="border-t border-gray-800 my-1" />

            {/* Logout */}
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-lg transition text-sm"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
