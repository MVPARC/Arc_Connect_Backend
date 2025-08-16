const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  verified: {           // <-- move this to root level
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // OTP expires after 5 minutes
  },
});

const OTP = mongoose.model("OTP", otpSchema);
module.exports = OTP;
