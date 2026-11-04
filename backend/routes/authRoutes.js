const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { createAuthLimiter } = require("../middlewares/rateLimit");
const {
  signup,
  verifyOTP,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Public routes (rate limited per IP)
const authLimiter = createAuthLimiter();
router.post("/signup", authLimiter, signup);
router.post("/verify-otp", authLimiter, verifyOTP);
router.post("/login", authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// Protected routes
router.get("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

module.exports = router;
