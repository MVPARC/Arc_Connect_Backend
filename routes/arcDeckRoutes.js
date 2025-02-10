const express = require("express");
const router = express.Router();
const arcDeckController = require("../controller/arcDeckController");
const auth = require("../middleware/Auth");
const checkRole = require("../middleware/checkRole");

// Analyze new document
router.post(
  "/analyze",
  auth,
  checkRole(["user", "admin"]),
  arcDeckController.analyzeDocument
);

// Get all analyses for authenticated user
router.get(
  "/analyses",
  auth,
  checkRole(["user", "admin"]),
  arcDeckController.getUserAnalyses
);

// Get specific analysis by ID
router.get(
  "/analyses/:id",
  auth,
  checkRole(["user", "admin"]),
  arcDeckController.getAnalysisById
);

module.exports = router;
