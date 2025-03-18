const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  totalSent: {
    type: Number,
    default: 0,
  },
  opens: {
    total: { type: Number, default: 0 },
    details: [
      {
        recipientId: String,
        timestamp: Date,
        ipAddress: String,
        userAgent: String,
        device: {
          type: { type: String }, // Change: Define as nested object
          vendor: String,
          model: String,
        },
        browser: {
          name: String,
          version: String,
        },
        os: {
          name: String,
          version: String,
        },
      },
    ],
  },
  clicks: {
    total: { type: Number, default: 0 },
    details: [
      {
        recipientId: String,
        timestamp: Date,
        url: String,
        ipAddress: String,
        userAgent: String,
        device: {
          type: { type: String }, // Change: Define as nested object
          vendor: String,
          model: String,
        },
        browser: {
          name: String,
          version: String,
        },
        os: {
          name: String,
          version: String,
        },
      },
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
reportSchema.index({ campaignId: 1 });
reportSchema.index({ user: 1, createdAt: -1 });
reportSchema.index({ user: 1, campaignId: 1 });

module.exports = mongoose.model("Report", reportSchema);
