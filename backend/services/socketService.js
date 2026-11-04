const { Server } = require("socket.io");
const marketData = require("../marketData");
const { corsOrigin } = require("../helpers/corsOrigin");

let io;
const socketSymbols = new Map(); // socketId → Set<symbol>
const priceCache = new Map(); // symbol → priceData
const dirtySymbols = new Set(); // symbols updated by the live feed since last push

const POLL_INTERVAL = 15000; // used when the Upstox live feed isn't connected
const PUSH_INTERVAL = 1000; // how often live feed ticks are pushed to clients

const toPriceData = (symbol, quote) => ({
  symbol,
  currentPrice: quote.currentPrice,
  change: quote.change,
  changePercent: quote.changePercent,
  dayHigh: quote.dayHigh,
  dayLow: quote.dayLow,
  volume: quote.volume,
});

const fetchPricesForSymbols = async (symbols) => {
  const results = {};
  try {
    const quotes = await marketData.getQuotes([...symbols]);
    Object.entries(quotes).forEach(([symbol, quote]) => {
      results[symbol] = toPriceData(symbol, quote);
    });
  } catch (error) {
    console.error("[Socket] Price fetch failed:", error.message);
  }
  return results;
};

const allSubscribedSymbols = () => {
  const all = new Set();
  socketSymbols.forEach((symbols) => symbols.forEach((s) => all.add(s)));
  return all;
};

// Send each socket only their subscribed symbols
const emitToSubscribers = (prices) => {
  socketSymbols.forEach((symbols, socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) return;

    const updates = {};
    symbols.forEach((symbol) => {
      if (prices[symbol]) updates[symbol] = prices[symbol];
    });

    if (Object.keys(updates).length > 0) {
      socket.emit("priceUpdate", updates);
    }
  });
};

// Live feed tick → merge into cache; pushed on the next PUSH_INTERVAL
const handleTick = (symbol, tick) => {
  const previous = priceCache.get(symbol) || { symbol };
  const previousClose = tick.previousClose;
  const change = previousClose
    ? parseFloat((tick.currentPrice - previousClose).toFixed(2))
    : previous.change;
  const changePercent = previousClose
    ? parseFloat(
        (((tick.currentPrice - previousClose) / previousClose) * 100).toFixed(
          2,
        ),
      )
    : previous.changePercent;

  priceCache.set(symbol, {
    ...previous,
    currentPrice: tick.currentPrice,
    change,
    changePercent,
    dayHigh: tick.dayHigh ?? previous.dayHigh,
    dayLow: tick.dayLow ?? previous.dayLow,
    volume: tick.volume ?? previous.volume,
  });
  dirtySymbols.add(symbol);
};

const startBroadcast = () => {
  // Push live feed updates
  setInterval(() => {
    if (dirtySymbols.size === 0) return;
    const updates = {};
    dirtySymbols.forEach((symbol) => {
      if (priceCache.has(symbol)) updates[symbol] = priceCache.get(symbol);
    });
    dirtySymbols.clear();
    emitToSubscribers(updates);
  }, PUSH_INTERVAL);

  // Poll when there is no live feed (Yahoo fallback, or feed reconnecting)
  setInterval(async () => {
    if (socketSymbols.size === 0 || marketData.isLiveFeedConnected()) return;

    const allSymbols = allSubscribedSymbols();
    if (allSymbols.size === 0) return;

    console.log(
      `[Socket] Polling ${allSymbols.size} symbol(s) for ${socketSymbols.size} client(s)`,
    );

    const prices = await fetchPricesForSymbols(allSymbols);
    Object.entries(prices).forEach(([symbol, data]) => {
      priceCache.set(symbol, data);
    });
    emitToSubscribers(prices);
  }, POLL_INTERVAL);
};

// Stop live feed for symbols no client is watching any more
const releaseSymbols = (symbols) => {
  const stillWanted = allSubscribedSymbols();
  const unused = [...symbols].filter((s) => !stillWanted.has(s));
  if (unused.length > 0) marketData.unsubscribeLive(unused);
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: corsOrigin(), credentials: true },
  });

  marketData.onTick(handleTick);

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    socketSymbols.set(socket.id, new Set());
    socket.emit("connected", { message: "Live prices connected ✅" });

    // Client subscribes to symbols
    socket.on("subscribe", async (symbols) => {
      if (!Array.isArray(symbols) || symbols.length === 0) return;
      const current = socketSymbols.get(socket.id) || new Set();
      const upper = symbols.map((s) => s.toUpperCase());
      upper.forEach((s) => current.add(s));
      socketSymbols.set(socket.id, current);
      console.log(`[Socket] ${socket.id} subscribed: ${upper.join(", ")}`);

      marketData.subscribeLive(upper).catch((err) => {
        console.error("[Socket] Live feed subscribe failed:", err.message);
      });

      // Send cached prices immediately
      const cached = {};
      upper.forEach((s) => {
        if (priceCache.has(s)) cached[s] = priceCache.get(s);
      });
      if (Object.keys(cached).length > 0) socket.emit("priceUpdate", cached);

      // Fetch fresh for uncached symbols
      const uncached = upper.filter((s) => !priceCache.has(s));
      if (uncached.length > 0) {
        const fresh = await fetchPricesForSymbols(new Set(uncached));
        Object.entries(fresh).forEach(([s, d]) => priceCache.set(s, d));
        if (Object.keys(fresh).length > 0) socket.emit("priceUpdate", fresh);
      }
    });

    // Client unsubscribes from symbols
    socket.on("unsubscribe", (symbols) => {
      if (!Array.isArray(symbols)) return;
      const current = socketSymbols.get(socket.id) || new Set();
      const upper = symbols.map((s) => s.toUpperCase());
      upper.forEach((s) => current.delete(s));
      socketSymbols.set(socket.id, current);
      releaseSymbols(upper);
    });

    socket.on("disconnect", (reason) => {
      const symbols = socketSymbols.get(socket.id) || new Set();
      socketSymbols.delete(socket.id);
      releaseSymbols(symbols);
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });
  });

  startBroadcast();
  console.log(
    "✅ Socket.io initialized (Upstox live feed, polling fallback every 15s)",
  );
  return io;
};

module.exports = { initSocket };
