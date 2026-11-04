import { io } from "socket.io-client";
import { BASE_URL } from "./api";

let socket = null;
// Kept here so pages can subscribe/listen before the socket has connected;
// subscriptions are (re)sent on every connect.
const subscribedSymbols = new Set();
const priceListeners = new Set();

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
    if (subscribedSymbols.size > 0) {
      socket.emit("subscribe", [...subscribedSymbols]);
    }
  });

  socket.on("priceUpdate", (updates) => {
    priceListeners.forEach((callback) => callback(updates));
  });

  socket.on("connected", (data) => {
    console.log("Socket:", data.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  subscribedSymbols.clear();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const subscribeToSymbols = (symbols) => {
  if (!symbols?.length) return;
  symbols.forEach((s) => subscribedSymbols.add(s));
  if (socket?.connected) socket.emit("subscribe", symbols);
};

export const unsubscribeFromSymbols = (symbols) => {
  if (!symbols?.length) return;
  symbols.forEach((s) => subscribedSymbols.delete(s));
  if (socket?.connected) socket.emit("unsubscribe", symbols);
};

export const onPriceUpdate = (callback) => {
  priceListeners.add(callback);
  return () => priceListeners.delete(callback);
};
