import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";

import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import VerifyOTP from "./pages/VerifyOTP";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StockList from "./pages/StockList";
import StockDetail from "./pages/StockDetail";
import Portfolio from "./pages/Portfolio";
import Transactions from "./pages/Transactions";
import Account from "./pages/Account";
import Watchlist from "./pages/Watchlist";
import MarketNews from "./pages/MarketNews";
import OrderBook from "./pages/OrderBook";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import NotificationBanner from "./components/NotificationBanner";

const Footer = () => (
  <footer className="py-6 text-center border-t border-gray-100 dark:border-gray-800 mt-auto">
    <p className="text-gray-400 dark:text-gray-300 text-sm">
      Made with <span className="text-red-400 text-base">❤️</span> by{" "}
      <span className="text-green-400 font-bold tracking-wide">Ashutosh</span>
    </p>
  </footer>
);

const AppContent = () => {
  const { user, loading } = useAuth();
  const { darkMode } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300 flex flex-col">
        <NotificationBanner />
        {user && <Navbar />}

        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={!user ? <Landing /> : <Navigate to="/stocks" />}
            />
            <Route
              path="/signup"
              element={!user ? <Signup /> : <Navigate to="/stocks" />}
            />
            <Route
              path="/verify-otp"
              element={!user ? <VerifyOTP /> : <Navigate to="/stocks" />}
            />
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/stocks" />}
            />

            {/* Always Accessible */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/stocks"
              element={
                <ProtectedRoute>
                  <StockList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stocks/:symbol"
              element={
                <ProtectedRoute>
                  <StockDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/watchlist"
              element={
                <ProtectedRoute>
                  <Watchlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portfolio"
              element={
                <ProtectedRoute>
                  <Portfolio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news"
              element={
                <ProtectedRoute>
                  <MarketNews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrderBook />
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        {user && <Footer />}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
