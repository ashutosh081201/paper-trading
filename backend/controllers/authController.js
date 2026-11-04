const User = require("../models/User");
const OTP = require("../models/OTP");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../helpers/mailer");
const { HttpError, upstream, sendError } = require("../helpers/httpErrors");
const { requireString } = require("../helpers/validate");

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const requireEmail = (value) =>
  requireString(value, "Email", { max: 254 }).toLowerCase();

const issueOTP = async (email, purpose) => {
  const otp = generateOTP();
  await OTP.deleteMany({ email, purpose });
  await OTP.create({
    email,
    otp,
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  try {
    await sendOTP(email, otp, purpose);
  } catch (error) {
    throw upstream(error, "Couldn't send the email. Please try again.");
  }
};

// Checks a code and counts wrong guesses; after MAX_OTP_ATTEMPTS the code is
// discarded so a 6-digit OTP can't be brute-forced in its 10-minute window.
const consumeOTP = async (email, otp, purpose, restartHint) => {
  const record = await OTP.findOne({ email, purpose });
  if (!record) {
    throw new HttpError(400, `OTP not found. ${restartHint}`);
  }
  if (record.expiresAt < new Date()) {
    await OTP.deleteMany({ email, purpose });
    throw new HttpError(400, `OTP expired. ${restartHint}`);
  }
  if (record.otp !== otp) {
    record.attempts += 1;
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteMany({ email, purpose });
      throw new HttpError(429, `Too many wrong attempts. ${restartHint}`);
    }
    await record.save();
    throw new HttpError(400, "Invalid OTP. Please try again.");
  }
  await OTP.deleteMany({ email, purpose });
};

// SIGNUP
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const cleanName = requireString(name, "Name", { max: 60 });
    const cleanEmail = requireEmail(email);
    const cleanPassword = requireString(password, "Password", { max: 128 });

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser?.isVerified) {
      return res.status(400).json({ message: "Email already registered" });
    }
    if (existingUser) {
      // Never verified (OTP expired or email failed) — let them start over
      existingUser.name = cleanName;
      existingUser.password = hashedPassword;
      await existingUser.save();
    } else {
      await User.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        isVerified: false,
      });
    }

    await issueOTP(cleanEmail, "verify");

    res.status(201).json({
      message: "Account created. OTP sent to your email.",
      email: cleanEmail,
    });
  } catch (error) {
    sendError(res, error, "Signup");
  }
};

// VERIFY OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    const cleanEmail = requireEmail(email);
    await consumeOTP(cleanEmail, String(otp), "verify", "Please sign up again.");
    await User.findOneAndUpdate({ email: cleanEmail }, { isVerified: true });
    res
      .status(200)
      .json({ message: "Email verified successfully. Please login." });
  } catch (error) {
    sendError(res, error, "Verification");
  }
};

// LOGIN — token sent in response body, not cookie
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const cleanEmail = requireEmail(email);
    const cleanPassword = requireString(password, "Password", { max: 128 });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }
    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ id: user._id }, process.env.TOKEN_KEY, {
      expiresIn: "24h",
    });
    // Send token in response body — no cookie
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        funds: user.funds,
      },
    });
  } catch (error) {
    sendError(res, error, "Login");
  }
};

// LOGOUT — no cookie to clear
const logout = async (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

// GET CURRENT USER
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    sendError(res, error, "Loading your profile");
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const cleanEmail = requireEmail(email);
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res
        .status(400)
        .json({ message: "No account found with this email" });
    }
    await issueOTP(cleanEmail, "reset");
    res.status(200).json({ message: "OTP sent to your email.", email: cleanEmail });
  } catch (error) {
    sendError(res, error, "Sending the OTP");
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const cleanEmail = requireEmail(email);
    const cleanPassword = requireString(newPassword, "Password", { max: 128 });
    await consumeOTP(cleanEmail, String(otp), "reset", "Please request a new code.");
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    await User.findOneAndUpdate({ email: cleanEmail }, { password: hashedPassword });
    res
      .status(200)
      .json({ message: "Password reset successfully. Please login." });
  } catch (error) {
    sendError(res, error, "Password reset");
  }
};

module.exports = {
  signup,
  verifyOTP,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
