const crypto = require("crypto");
const marketData = require("../marketData");
const { getLoginUrl, exchangeCode } = require("../marketData/upstoxAuth");

const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map(); // state → expiresAt

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8">
<title>${title}</title></head><body style="font-family:sans-serif;padding:40px">
<h2>${title}</h2><p>${body}</p></body></html>`;

const secretMatches = (provided) => {
  const expected = process.env.UPSTOX_ADMIN_SECRET;
  if (!expected || typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// GET /api/upstox/login?secret=... — admin starts the Upstox OAuth login
const login = (req, res) => {
  if (!secretMatches(req.query.secret)) {
    return res.status(403).json({ message: "Invalid admin secret" });
  }
  if (!process.env.UPSTOX_API_KEY || !process.env.UPSTOX_REDIRECT_URI) {
    return res
      .status(500)
      .json({ message: "UPSTOX_API_KEY and UPSTOX_REDIRECT_URI must be set" });
  }

  const now = Date.now();
  pendingStates.forEach((expiresAt, s) => {
    if (expiresAt < now) pendingStates.delete(s);
  });

  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, now + STATE_TTL_MS);
  res.redirect(getLoginUrl(state));
};

// GET /api/upstox/callback — Upstox redirects here with ?code&state
const callback = async (req, res) => {
  const { code, state } = req.query;
  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);

  if (!code || !expiresAt || expiresAt < Date.now()) {
    return res
      .status(400)
      .send(
        page(
          "Upstox login failed",
          "Invalid or expired login request. Please start again.",
        ),
      );
  }

  try {
    const { userName, expiresAt: tokenExpiry } = await exchangeCode(code);
    res.send(
      page(
        "Upstox connected ✅",
        `Connected as ${escapeHtml(userName)}. Token valid until ${escapeHtml(
          tokenExpiry.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        )} IST. You can close this tab.`,
      ),
    );
  } catch (error) {
    console.error(
      "Upstox token exchange failed:",
      error.response?.data || error.message,
    );
    res
      .status(500)
      .send(
        page(
          "Upstox login failed",
          "Could not get an access token from Upstox.",
        ),
      );
  }
};

// GET /api/upstox/status
const status = async (req, res) => {
  try {
    res.status(200).json(await marketData.getStatus());
  } catch (error) {
    console.error("Upstox status failed:", error);
    res.status(500).json({ message: "Failed to get status" });
  }
};

module.exports = { login, callback, status };
