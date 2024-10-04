// models/emailModel.js
const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const Email = mongoose.model("Email", emailSchema);

module.exports = Email;
