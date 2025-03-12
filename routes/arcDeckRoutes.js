const express = require("express");
const router = express.Router();
const arcDeckController = require("../controller/arcDeckController");

// Public analyze endpoint (no auth required)
router.post("/analyze", arcDeckController.analyzeDocument);

// Protected endpoints
router.get(
  "/analyses",

  arcDeckController.getUserAnalyses
);

// Get specific analysis by ID
router.get("/analyses/:id", arcDeckController.getAnalysisById);

module.exports = router;
