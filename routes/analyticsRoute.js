const express = require("express");
const router = express.Router();
const analyticsController = require("../controller/analyticsController");
const auth = require("../middleware/Auth");

// ✅ Apply auth middleware (invoke function)
router.use(auth());

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Email analytics endpoints
 */

/**
 * @swagger
 * /analytics/ping:
 *   get:
 *     summary: Ping route to check if analytics route is working
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Returns a confirmation message and user info
 */
router.get("/ping", (req, res) => {
  res.json({
    message: "Analytics route is working",
    user: req.user,
    organization: req.organization,
  });
});

/**
 * @swagger
 * /analytics/campaign/{campaignId}/summary:
 *   get:
 *     summary: Get campaign summary
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Summary data for the campaign
 */
router.get("/campaign/:campaignId/summary", analyticsController.getCampaignSummary);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/opens:
 *   get:
 *     summary: Get open stats for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Open analytics
 */
router.get("/campaign/:campaignId/opens", analyticsController.getCampaignOpens);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/clicks:
 *   get:
 *     summary: Get click stats for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Click analytics
 */
router.get("/campaign/:campaignId/clicks", analyticsController.getCampaignClicks);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/geo:
 *   get:
 *     summary: Get geographic distribution for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Geo analytics
 */
router.get("/campaign/:campaignId/geo", analyticsController.getCampaignGeoAnalytics);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/devices:
 *   get:
 *     summary: Get device analytics for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device analytics
 */
router.get("/campaign/:campaignId/devices", analyticsController.getCampaignDeviceAnalytics);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/timing:
 *   get:
 *     summary: Get timing analytics for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timing analytics
 */
router.get("/campaign/:campaignId/timing", analyticsController.getCampaignTimingAnalytics);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/recipients:
 *   get:
 *     summary: Get recipient analytics for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipient analytics
 */
router.get("/campaign/:campaignId/recipients", analyticsController.getCampaignRecipientAnalytics);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/links:
 *   get:
 *     summary: Get link click analytics for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link analytics
 */
router.get("/campaign/:campaignId/links", analyticsController.getCampaignLinkAnalytics);

/**
 * @swagger
 * /analytics/campaign/{campaignId}/bounces:
 *   get:
 *     summary: Get bounce analytics for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bounce analytics
 */
router.get("/campaign/:campaignId/bounces", analyticsController.getCampaignBounceAnalytics);

/**
 * @swagger
 * /analytics/user/summary:
 *   get:
 *     summary: Get user-level summary analytics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: User summary
 */
router.get("/user/summary", analyticsController.getUserSummary);

/**
 * @swagger
 * /analytics/user/campaigns/performance:
 *   get:
 *     summary: Get performance across campaigns
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Campaign performance
 */
router.get("/user/campaigns/performance", analyticsController.getUserCampaignPerformance);

/**
 * @swagger
 * /analytics/user/trends:
 *   get:
 *     summary: Get user trends over time
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: User trend analytics
 */
router.get("/user/trends", analyticsController.getUserTrends);

/**
 * @swagger
 * /analytics/user/geo:
 *   get:
 *     summary: Get geographic distribution across all campaigns
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: User geo analytics
 */
router.get("/user/geo", analyticsController.getUserGeoDistribution);

/**
 * @swagger
 * /analytics/user/devices:
 *   get:
 *     summary: Get user device usage across campaigns
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Device distribution
 */
router.get("/user/devices", analyticsController.getUserDeviceDistribution);

/**
 * @swagger
 * /analytics/user/timing:
 *   get:
 *     summary: Get timing analytics across user campaigns
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: User timing analytics
 */
router.get("/user/timing", analyticsController.getUserTimingAnalytics);

/**
 * @swagger
 * /analytics/compare/campaigns:
 *   get:
 *     summary: Compare multiple campaigns
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Campaign comparison data
 */
router.get("/compare/campaigns", analyticsController.compareCampaigns);

/**
 * @swagger
 * /analytics/benchmark:
 *   get:
 *     summary: Get email marketing benchmarks
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Benchmark analytics
 */
router.get("/benchmark", analyticsController.getBenchmarks);

/**
 * @swagger
 * /analytics/recommendations:
 *   get:
 *     summary: Get campaign improvement recommendations
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Recommendation engine output
 */
router.get("/recommendations", analyticsController.getRecommendations);

module.exports = router;
