const mongoose = require("mongoose");

const arcDeckAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  analysisResult: {
    type: Object,
    required: true,
  },
  overallScore: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for better query performance
arcDeckAnalysisSchema.index({ userId: 1, createdAt: -1 });
arcDeckAnalysisSchema.index({ fileName: 1 });

const ArcDeckAnalysis = mongoose.model(
  "ArcDeckAnalysis",
  arcDeckAnalysisSchema
);

module.exports = ArcDeckAnalysis;
