const rateLimit = require("express-rate-limit");

// Limits login, signup, OTP and password-reset attempts per IP
const createAuthLimiter = ({
  max = Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  windowMs = 15 * 60 * 1000,
} = {}) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again in a few minutes." },
  });

module.exports = { createAuthLimiter };
