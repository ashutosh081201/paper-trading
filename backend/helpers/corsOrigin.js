// CORS_ORIGINS is a comma-separated allow-list (e.g. the Vercel URL).
// When it's unset — local development — any origin is allowed.
const corsOrigin = () => {
  const allowed = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return allowed.length > 0 ? allowed : true;
};

module.exports = { corsOrigin };
