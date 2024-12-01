// models/emailModel.js
const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Add compound unique index for user and email combination
emailSchema.index({ user: 1, email: 1 }, { unique: true });

const Email = mongoose.model("Email", emailSchema);

module.exports = Email;
