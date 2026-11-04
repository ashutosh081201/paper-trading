const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["verify", "reset"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Wrong guesses so far; the code is discarded after MAX_OTP_ATTEMPTS
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OTP", otpSchema);
