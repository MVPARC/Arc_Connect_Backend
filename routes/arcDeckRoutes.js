const express = require("express");
const router = express.Router();
const arcDeckController = require("../controller/arcDeckController");
const authCheck = require("../middleware/authCheck");
const checkRole = require("../middleware/checkRole");

/**
 * @swagger
 * tags:
 *   name: ArcDeck
 *   description: Document analysis and retrieval endpoints
 */

/**
 * @swagger
 * /arcDeck/analyze:
 *   post:
 *     summary: Analyze a document (public endpoint)
 *     tags: [ArcDeck]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The document content to analyze
 *     responses:
 *       200:
 *         description: Analysis result
 *       400:
 *         description: Invalid input
 */
router.post("/analyze", arcDeckController.analyzeDocument);

/**
 * @swagger
 * /arcDeck/analyses:
 *   get:
 *     summary: Get all analyses for the logged-in user
 *     tags: [ArcDeck]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of analyses
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/analyses",
  authCheck,
  checkRole(["admin", "user"]),
  arcDeckController.getUserAnalyses
);

/**
 * @swagger
 * /arcDeck/analyses/{id}:
 *   get:
 *     summary: Get a specific analysis by ID
 *     tags: [ArcDeck]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the analysis
 *     responses:
 *       200:
 *         description: Analysis data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Analysis not found
 */
router.get(
  "/analyses/:id",
  authCheck,
  checkRole(["admin", "user"]),
  arcDeckController.getAnalysisById
);

module.exports = router;
