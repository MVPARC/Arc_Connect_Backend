// const mongoose = require("mongoose");

// // Define recipient schema
// const recipientSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//   },
//   name: {
//     type: String,
//     required: true,
//   },
//   id: {
//     type: String,
//     required: true,
//   },
// });

// const campaignSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },
//   subject: {
//     type: String,
//     required: true,
//   },
//   templateId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "EmailTemplate",
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ["draft", "scheduled", "sending", "completed", "failed", "cancelled"],
//     default: "draft",
//   },
//   scheduledDate: {
//     type: Date,
//   },
//   senderEmail: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Email",
//   },
//   // Add recipients array
//   recipients: [recipientSchema],
//   progress: {
//     successCount: { type: Number, default: 0 },
//     failCount: { type: Number, default: 0 },
//     totalProcessed: { type: Number, default: 0 },
//     totalRecipients: { type: Number, default: 0 },
//   },
//   errorMessage: {
//     type: String,
//   },
//   completedAt: {
//     type: Date,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Update the updatedAt timestamp before saving
// campaignSchema.pre("save", function (next) {
//   this.updatedAt = new Date();
//   next();
// });

// module.exports = mongoose.model("Campaign", campaignSchema);
// models/campaignModel.js
const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
});

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmailTemplate",
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "scheduled", "sending", "completed", "failed", "cancelled"],
    default: "draft",
  },
  scheduledDate: {
    type: Date,
  },
  senderEmail: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Email",
  },
  // Add recipient lists reference
  recipientLists: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecipientList",
    },
  ],
  // Keep existing recipients array for direct recipients
  recipients: [recipientSchema],
  progress: {
    successCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    totalRecipients: { type: Number, default: 0 },
  },
  errorMessage: {
    type: String,
  },
  completedAt: {
    type: Date,
  },
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp before saving
campaignSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Add indexes for better query performance
campaignSchema.index({ user: 1, createdAt: -1 });
campaignSchema.index({ user: 1, status: 1 });
campaignSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model("Campaign", campaignSchema);
