// models/recipientModel.js
const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
  {
    listName: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipients: [
      {
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        tags: [
          {
            type: String,
            trim: true,
          },
        ],
        additionalInfo: {
          type: Map,
          of: String,
          default: new Map(),
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for efficient querying
recipientSchema.index({ user: 1, "recipients.email": 1 });
recipientSchema.index({ user: 1, tags: 1 });

module.exports = mongoose.model("RecipientList", recipientSchema);