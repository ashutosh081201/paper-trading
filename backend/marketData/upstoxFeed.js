// Upstox Market Data Feed V3 (WebSocket, protobuf messages).
// Emits "tick" (symbol, { currentPrice, previousClose, dayHigh, dayLow, volume }).
const path = require("path");
const crypto = require("crypto");
const EventEmitter = require("events");
const protobuf = require("protobufjs");
const instruments = require("./upstoxInstruments");
const { api } = require("./upstox");

const root = protobuf.loadSync(path.join(__dirname, "MarketDataFeed.proto"));
const FeedResponse = root.lookupType(
  "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse",
);

const MODE = "full";
const RECONNECT_DELAY_MS = 5000;
const KEYS_PER_MESSAGE = 100;

const feed = new EventEmitter();
const wantedKeys = new Set();
let ws = null;
let connecting = false;
let reconnectTimer = null;

const send = (method, keys) => {
  if (!ws || ws.readyState !== WebSocket.OPEN || keys.length === 0) return;
  for (let i = 0; i < keys.length; i += KEYS_PER_MESSAGE) {
    const message = {
      guid: crypto.randomUUID(),
      method,
      data: { mode: MODE, instrumentKeys: keys.slice(i, i + KEYS_PER_MESSAGE) },
    };
    // Upstox requires the subscription request as a binary frame
    ws.send(Buffer.from(JSON.stringify(message)));
  }
};

const handleMessage = (data) => {
  let decoded;
  try {
    decoded = FeedResponse.toObject(FeedResponse.decode(new Uint8Array(data)), {
      longs: Number,
      enums: String,
    });
  } catch (err) {
    console.error("[UpstoxFeed] Failed to decode message:", err.message);
    return;
  }

  Object.entries(decoded.feeds || {}).forEach(([key, item]) => {
    const symbols = instruments.toSymbols(key);
    if (symbols.length === 0) return;

    const full = item.fullFeed?.marketFF || item.fullFeed?.indexFF;
    const ltpc = item.ltpc || full?.ltpc;
    if (!ltpc?.ltp) return;

    const day = full?.marketOHLC?.ohlc?.find((o) => o.interval === "1d");
    const tick = {
      currentPrice: ltpc.ltp,
      previousClose: ltpc.cp,
      dayHigh: day?.high,
      dayLow: day?.low,
      volume: full?.vtt ?? day?.vol,
    };
    symbols.forEach((symbol) => feed.emit("tick", symbol, tick));
  });
};

const scheduleReconnect = () => {
  if (reconnectTimer || wantedKeys.size === 0) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
};

const connect = async () => {
  if (ws || connecting || wantedKeys.size === 0) return;
  connecting = true;
  try {
    const response = await api.get("/v3/feed/market-data-feed/authorize");
    const url = response.data?.data?.authorized_redirect_uri;
    if (!url) throw new Error("No feed URL returned");

    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    ws = socket;

    socket.addEventListener("open", () => {
      console.log("[UpstoxFeed] Connected");
      send("sub", [...wantedKeys]);
    });
    socket.addEventListener("message", (event) => handleMessage(event.data));
    socket.addEventListener("error", (event) => {
      console.error("[UpstoxFeed] Error:", event.message || "socket error");
    });
    socket.addEventListener("close", () => {
      console.log("[UpstoxFeed] Disconnected");
      if (ws === socket) ws = null;
      scheduleReconnect();
    });
  } catch (err) {
    console.error("[UpstoxFeed] Connect failed:", err.message);
    ws = null;
    scheduleReconnect();
  } finally {
    connecting = false;
  }
};

const subscribe = async (symbols) => {
  await instruments.ensureLoaded();
  const newKeys = symbols
    .map(instruments.toInstrumentKey)
    .filter((key) => key && !wantedKeys.has(key));
  newKeys.forEach((key) => wantedKeys.add(key));

  if (ws) send("sub", newKeys);
  else connect();
};

const unsubscribe = (symbols) => {
  const keys = symbols
    .map(instruments.toInstrumentKey)
    .filter((key) => key && wantedKeys.has(key));
  keys.forEach((key) => wantedKeys.delete(key));
  send("unsub", keys);

  if (wantedKeys.size === 0 && ws) {
    ws.close();
    ws = null;
  }
};

const isConnected = () => Boolean(ws && ws.readyState === WebSocket.OPEN);

feed.subscribe = subscribe;
feed.unsubscribe = unsubscribe;
feed.isConnected = isConnected;
feed.handleMessage = handleMessage; // exposed for testing

module.exports = feed;
