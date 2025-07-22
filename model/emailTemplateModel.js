const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  htmlStructure: {
    type: Object,
  },
  organization: { 
    type: String, 
    required: true, 
    index: true }, // Added

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add compound index for efficient querying
emailTemplateSchema.index({ user: 1, organization: 1, createdAt: -1 });

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
