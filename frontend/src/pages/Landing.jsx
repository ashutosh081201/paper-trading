import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const Landing = () => {
  const { darkMode, toggleTheme } = useTheme();

  const features = [
    {
      icon: "📈",
      title: "500+ NSE Stocks & Indices",
      desc: "Trade from 500+ NIFTY stocks plus 15 market indices including NIFTY 50, SENSEX, BANK NIFTY and more.",
    },
    {
      icon: "🔴",
      title: "Real-time Live Prices",
      desc: "Socket.io powered live price updates every 15 seconds. Watchlist, portfolio and stock detail all update automatically.",
    },
    {
      icon: "🕯️",
      title: "Advanced Charts",
      desc: "Candlestick charts with 10+ indicators — EMA, SMA, Bollinger Bands, RSI, MACD, Stochastic, OBV and more.",
    },
    {
      icon: "🔀",
      title: "Stock vs Index Comparison",
      desc: "Compare up to 3 stocks and indices by % return. See how your picks perform against NIFTY 50.",
    },
    {
      icon: "💼",
      title: "Delivery & Intraday",
      desc: "Place CNC delivery orders or MIS intraday orders with 5x leverage — just like real Zerodha/Upstox.",
    },
    {
      icon: "🎯",
      title: "Stop Loss & Target Orders",
      desc: "Set stop loss and target price orders. Auto-executed by background cron — true risk management.",
    },
    {
      icon: "📋",
      title: "Order Book",
      desc: "Full order history with Pending, Completed and All Trades tabs. Just like a real trading terminal.",
    },
    {
      icon: "📊",
      title: "Portfolio Analytics",
      desc: "XIRR, Win Rate, Sector Performance and 8 chart types — Allocation, P&L, Cumulative, Monthly and more.",
    },
    {
      icon: "🏭",
      title: "Sector-wise Performance",
      desc: "See how each sector in your portfolio is performing. Identify your best and worst sectors instantly.",
    },
    {
      icon: "⭐",
      title: "Multiple Watchlists",
      desc: "Create up to 5 named watchlists with 20 stocks each. Banking, IT, Midcap — organise your way.",
    },
    {
      icon: "🤖",
      title: "AI Sentiment Analysis",
      desc: "Google Gemini powered AI analysis for any stock — Bullish/Bearish/Neutral with score and key reasons.",
    },
    {
      icon: "🔔",
      title: "Price & Circuit Alerts",
      desc: "Set price alerts and get email notifications. Auto-detects upper/lower circuit breakers in your holdings.",
    },
    {
      icon: "📝",
      title: "Stock Notes",
      desc: "Add personal notes to any stock. Track why you bought, your thesis, lessons learned — your trading journal.",
    },
    {
      icon: "📄",
      title: "P&L Statement PDF",
      desc: "Month-wise P&L report with summary cards — just like your actual demat account statement. Export anytime.",
    },
    {
      icon: "📰",
      title: "Market News & Indices",
      desc: "Live NSE/BSE market news and 15 index widget on the home screen. Stay informed before you trade.",
    },
    {
      icon: "📥",
      title: "CSV & PDF Export",
      desc: "Export complete trade history as CSV or PDF. Full P&L, holding duration, balance — everything included.",
    },
  ];

  const stats = [
    { value: "500+", label: "NSE Stocks" },
    { value: "15s", label: "Live Updates" },
    { value: "10+", label: "Indicators" },
    { value: "₹10L", label: "Virtual Funds" },
  ];

  const highlights = [
    { icon: "⚡", text: "Real-time prices via Socket.io" },
    { icon: "🤖", text: "AI sentiment powered by Gemini" },
    { icon: "📊", text: "XIRR like mutual funds" },
    { icon: "🔔", text: "Email alerts for price & circuits" },
    { icon: "🎯", text: "Auto stop loss & target execution" },
    { icon: "📄", text: "Month-wise P&L PDF export" },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}
    >
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-gray-200 dark:border-gray-800">
        <Link
          to="/"
          className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
        >
          Stock<span className="text-green-400">Lab</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
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
          <Link
            to="/login"
            className={`text-sm px-3 sm:px-4 py-2 rounded-lg border transition ${
              darkMode
                ? "border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                : "border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 sm:px-4 py-2 rounded-lg transition font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-500 text-xs sm:text-sm px-3 sm:px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            NSE Paper Trading — Real Prices, Zero Risk
          </div>

          {/* Title */}
          <h1
            className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            Learn to Trade.
            <span className="text-green-400"> Risk Nothing.</span>
          </h1>

          <p
            className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed px-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Practice NSE stock trading with ₹1,00,000 virtual funds. Real-time
            prices via Socket.io, AI sentiment analysis, professional charts
            with 10+ indicators, and a full suite of trading tools — completely
            free.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link
              to="/signup"
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-xl transition text-base"
            >
              Start Trading Free →
            </Link>
            <Link
              to="/login"
              className={`border font-bold px-8 py-3 rounded-xl transition text-base ${
                darkMode
                  ? "border-gray-600 hover:border-gray-400 text-white"
                  : "border-gray-300 hover:border-gray-500 text-gray-900"
              }`}
            >
              Login
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-10">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border ${
                  darkMode
                    ? "bg-gray-900 border-gray-800"
                    : "bg-white border-gray-200 shadow-sm"
                }`}
              >
                <p className="text-green-400 font-bold text-2xl sm:text-3xl">
                  {stat.value}
                </p>
                <p
                  className={`text-xs sm:text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Highlights Strip */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 mb-14 ${
              darkMode
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base flex-shrink-0">{h.icon}</span>
                  <p
                    className={`text-xs text-left ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {h.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="text-left mb-16">
            <h2
              className={`text-xl sm:text-2xl font-bold text-center mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Everything you need to become a better trader
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`border rounded-2xl p-5 transition hover:border-green-500/40 ${
                    darkMode
                      ? "bg-gray-900 border-gray-800"
                      : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  <div className="text-2xl mb-3">{feature.icon}</div>
                  <h3
                    className={`font-semibold mb-1.5 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={`text-xs leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-16">
            <h2
              className={`text-xl sm:text-2xl font-bold text-center mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Get started in 3 steps
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: "✉️",
                  title: "Create Account",
                  desc: "Sign up with email + OTP verification. Takes 30 seconds.",
                },
                {
                  step: "02",
                  icon: "💰",
                  title: "Get ₹10L Virtual Funds",
                  desc: "Instantly credited. No credit card, no real money involved.",
                },
                {
                  step: "03",
                  icon: "📈",
                  title: "Start Trading",
                  desc: "Browse 500+ stocks, analyse with AI, place orders and track P&L.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-6 text-left relative ${
                    darkMode
                      ? "bg-gray-900 border-gray-800"
                      : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  <span className="text-green-400/30 font-bold text-5xl absolute top-4 right-4 select-none">
                    {item.step}
                  </span>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3
                    className={`font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div
            className={`rounded-2xl border p-8 sm:p-12 ${
              darkMode
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-500 text-xs px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              500+ NSE Stocks • Live Prices Every 15s
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-bold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Ready to trade smarter?
            </h2>
            <p
              className={`text-sm sm:text-base mb-6 max-w-md mx-auto ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Join StockLab and practice with real NSE prices. Build your
              strategy before risking real money.
            </p>
            <Link
              to="/signup"
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-3 rounded-xl transition text-base inline-block"
            >
              Create Free Account →
            </Link>
            <p
              className={`text-xs mt-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
            >
              No credit card • No real money • No risk
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className={`py-6 text-center border-t ${darkMode ? "border-gray-800" : "border-gray-200"}`}
      >
        <p
          className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}
        >
          Made with <span className="text-red-400 text-base">❤️</span> by{" "}
          <span className="text-green-400 font-bold tracking-wide">
            Ashutosh
          </span>
        </p>
      </footer>
    </div>
  );
};

export default Landing;
