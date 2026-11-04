import axios from "axios";

// VITE_API_URL is set for deployed builds. Locally the backend runs on port
// 3000 of the same machine that serves the frontend, so this keeps working
// when the network IP changes (localhost or LAN IP).
export const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  `${window.location.protocol}//${window.location.hostname}:3000`; // ← exported

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AUTH
export const signup = (data) => API.post("/api/auth/signup", data);
export const verifyOTP = (data) => API.post("/api/auth/verify-otp", data);
export const login = (data) => API.post("/api/auth/login", data);
export const logout = () => API.get("/api/auth/logout");
export const getMe = () => API.get("/api/auth/me");
export const forgotPassword = (data) =>
  API.post("/api/auth/forgot-password", data);
export const resetPassword = (data) =>
  API.post("/api/auth/reset-password", data);

// STOCKS
export const getAllStocks = () => API.get("/api/stocks/list");
export const getQuote = (symbol) => API.get(`/api/stocks/quote/${symbol}`);
export const searchStocks = (query) => API.get(`/api/stocks/search?q=${query}`);
export const getHistoricalData = (symbol, interval, range) =>
  API.get(`/api/stocks/history/${symbol}?interval=${interval}&range=${range}`);

// ORDERS
export const buyStock = (data) => API.post("/api/orders/buy", data);
export const sellStock = (data) => API.post("/api/orders/sell", data);

// HOLDINGS
export const getHoldings = () => API.get("/api/holdings");

// POSITIONS
export const getPositions = () => API.get("/api/positions");

// TRANSACTIONS
export const getTransactions = () => API.get("/api/transactions");

// ACCOUNT
export const getAccountSummary = () => API.get("/api/account");
export const addFunds = (data) => API.post("/api/account/add-funds", data);
export const resetAccount = () => API.post("/api/account/reset");
export const deleteAccount = () => API.delete("/api/account/delete");

// WATCHLIST — backward compatible
export const getWatchlist = () => API.get("/api/watchlist");
export const addToWatchlist = (data) => API.post("/api/watchlist/add", data);
export const removeFromWatchlist = (symbol) =>
  API.delete(`/api/watchlist/remove/${symbol}`);
export const checkWatchlist = (symbol) =>
  API.get(`/api/watchlist/check/${symbol}`);

// WATCHLIST — multiple
export const getAllWatchlists = () => API.get("/api/watchlist/all");
export const createWatchlist = (data) =>
  API.post("/api/watchlist/create", data);
export const deleteWatchlist = (id) =>
  API.delete(`/api/watchlist/delete/${id}`);
export const renameWatchlist = (id, data) =>
  API.patch(`/api/watchlist/rename/${id}`, data);
export const getWatchlistById = (id) => API.get(`/api/watchlist/list/${id}`);
export const addToWatchlistById = (id, data) =>
  API.post(`/api/watchlist/list/${id}/add`, data);
export const removeFromWatchlistById = (id, symbol) =>
  API.delete(`/api/watchlist/list/${id}/remove/${symbol}`);

// NEWS
export const getMarketNews = () => API.get("/api/news/market");
export const getMarketIndices = () => API.get("/api/news/indices");

// PRICE ALERTS
export const createAlert = (data) => API.post("/api/alerts", data);
export const getAlerts = () => API.get("/api/alerts");
export const deleteAlert = (id) => API.delete(`/api/alerts/${id}`);

// SENTIMENT
export const getStockSentiment = (symbol, company) =>
  API.get(`/api/sentiment/${symbol}?company=${encodeURIComponent(company)}`);

// LIMIT ORDERS
export const createLimitOrder = (data) => API.post("/api/limit-orders", data);
export const getPendingOrders = () => API.get("/api/limit-orders/pending");
export const getAllOrders = () => API.get("/api/limit-orders");
export const cancelLimitOrder = (id) => API.delete(`/api/limit-orders/${id}`);

// NOTES
export const getNotes = (symbol) => API.get(`/api/notes/${symbol}`);
export const createNote = (symbol, data) =>
  API.post(`/api/notes/${symbol}`, data);
export const deleteNote = (id) => API.delete(`/api/notes/${id}`);
export const updateNote = (id, data) => API.patch(`/api/notes/${id}`, data);
