// Upstox access token handling.
// Prefers the 1-year read-only Analytics Token (UPSTOX_ANALYTICS_TOKEN);
// otherwise uses an OAuth token saved via /api/upstox/login (expires 3:30 AM IST daily).
const axios = require("axios");
const UpstoxToken = require("../models/UpstoxToken");

const API_BASE = "https://api.upstox.com";

let cachedToken = null; // { accessToken, expiresAt }
let lastLookup = 0;

// Upstox OAuth tokens expire at 3:30 AM IST (22:00 UTC) after issue
const nextExpiry = (from = new Date()) => {
  const expiry = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      22,
      0,
      0,
    ),
  );
  if (expiry <= from) expiry.setUTCDate(expiry.getUTCDate() + 1);
  return expiry;
};

const getAccessToken = async () => {
  if (process.env.UPSTOX_ANALYTICS_TOKEN)
    return process.env.UPSTOX_ANALYTICS_TOKEN;

  if (cachedToken && cachedToken.expiresAt > new Date())
    return cachedToken.accessToken;

  // Check the database at most once a minute
  if (Date.now() - lastLookup < 60000) return null;
  lastLookup = Date.now();
  try {
    const stored = await UpstoxToken.findOne({
      expiresAt: { $gt: new Date() },
    });
    cachedToken = stored
      ? { accessToken: stored.accessToken, expiresAt: stored.expiresAt }
      : null;
  } catch (_) {
    cachedToken = null;
  }
  return cachedToken?.accessToken || null;
};

const getTokenStatus = async () => {
  if (process.env.UPSTOX_ANALYTICS_TOKEN)
    return { connected: true, tokenType: "analytics" };
  const token = await getAccessToken();
  return token
    ? { connected: true, tokenType: "oauth", expiresAt: cachedToken.expiresAt }
    : { connected: false, tokenType: null };
};

// Called when Upstox rejects the token (401) so we stop using it
const invalidateToken = () => {
  cachedToken = null;
  lastLookup = Date.now();
};

const getLoginUrl = (state) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.UPSTOX_API_KEY,
    redirect_uri: process.env.UPSTOX_REDIRECT_URI,
    state,
  });
  return `${API_BASE}/v2/login/authorization/dialog?${params}`;
};

// Exchange the auth code for an access token and save it
const exchangeCode = async (code) => {
  const body = new URLSearchParams({
    code,
    client_id: process.env.UPSTOX_API_KEY,
    client_secret: process.env.UPSTOX_API_SECRET,
    redirect_uri: process.env.UPSTOX_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const response = await axios.post(
    `${API_BASE}/v2/login/authorization/token`,
    body,
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    },
  );

  const { access_token, user_id, user_name } = response.data;
  const expiresAt = nextExpiry();

  await UpstoxToken.deleteMany({});
  await UpstoxToken.create({
    accessToken: access_token,
    expiresAt,
    upstoxUserId: user_id,
    upstoxUserName: user_name,
  });

  cachedToken = { accessToken: access_token, expiresAt };
  return { userName: user_name, expiresAt };
};

module.exports = {
  API_BASE,
  getAccessToken,
  getTokenStatus,
  invalidateToken,
  getLoginUrl,
  exchangeCode,
};
