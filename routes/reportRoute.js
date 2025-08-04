const express = require("express");
const router = express.Router();
const reportController = require("../controller/reportController");
const auth = require("../middleware/Auth");

// ✅ Apply auth middleware to all routes
router.use(auth());

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Campaign reports and analytics
 */

/**
 * @swagger
 * /reports/dashboard/analytics:
 *   get:
 *     summary: Get dashboard-wide analytics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics returned
 */
router.get("/dashboard/analytics", reportController.getDashboardAnalytics);

/**
 * @swagger
 * /reports/test:
 *   get:
 *     summary: Test the report route
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Route works
 */
router.get("/test", (req, res) => res.json({ message: "Report routes working" }));

/**
 * @swagger
 * /reports/{campaignId}/opens:
 *   get:
 *     summary: Get open details for a campaign
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the campaign
 *     responses:
 *       200:
 *         description: Open data returned
 */
router.get("/:campaignId/opens", reportController.getOpenDetailsByCampaign);

/**
 * @swagger
 * /reports/{campaignId}/analytics/clicks:
 *   get:
 *     summary: Get click analytics for a campaign
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Click analytics returned
 */
router.get("/:campaignId/analytics/clicks", reportController.getCampaignClickAnalytics);

/**
 * @swagger
 * /reports/{campaignId}:
 *   put:
 *     summary: Update a report for a campaign
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Report update fields
 *     responses:
 *       200:
 *         description: Report updated
 */
router.put("/:campaignId", reportController.updateReport);

/**
 * @swagger
 * /reports/{campaignId}:
 *   get:
 *     summary: Get a report for a specific campaign
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Report retrieved
 */
router.get("/:campaignId", reportController.getReportForCampaign);

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All reports retrieved
 */
router.get("/", reportController.getAllReports);

module.exports = router;
