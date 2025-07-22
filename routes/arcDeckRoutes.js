const express = require("express");
const router = express.Router();
const arcDeckController = require("../controller/arcDeckController");
const authCheck = require("../middleware/authCheck");       // Add this line
const checkRole = require("../middleware/checkRole");       // Optional: for role-based access

// ✅ Public: Analyze a document (no auth)
router.post("/analyze", arcDeckController.analyzeDocument);

// ✅ Protected: Get all analyses for logged-in user
router.get(
  "/analyses",
  authCheck,                            // 🔒 Authenticate the user
  checkRole(["admin", "user"]),        // ✅ Optional: restrict roles if needed
  arcDeckController.getUserAnalyses
);

// ✅ Protected: Get specific analysis by ID
router.get(
  "/analyses/:id",
  authCheck,
  checkRole(["admin", "user"]),
  arcDeckController.getAnalysisById
);

module.exports = router;
