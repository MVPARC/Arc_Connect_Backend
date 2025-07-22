const express = require("express");
const router = express.Router();
const analyticsController = require("../controller/analyticsController");
const auth = require("../middleware/Auth");

// ✅ Apply auth middleware (invoke function)
router.use(auth());

// ✅ Debug route
router.get("/ping", (req, res) => {
  res.json({
    message: "Analytics route is working",
    user: req.user,
    organization: req.organization,
  });
});

// ✅ Campaign-specific analytics
router.get("/campaign/:campaignId/summary", analyticsController.getCampaignSummary);
router.get("/campaign/:campaignId/opens", analyticsController.getCampaignOpens);
router.get("/campaign/:campaignId/clicks", analyticsController.getCampaignClicks);
router.get("/campaign/:campaignId/geo", analyticsController.getCampaignGeoAnalytics);
router.get("/campaign/:campaignId/devices", analyticsController.getCampaignDeviceAnalytics);
router.get("/campaign/:campaignId/timing", analyticsController.getCampaignTimingAnalytics);
router.get("/campaign/:campaignId/recipients", analyticsController.getCampaignRecipientAnalytics);
router.get("/campaign/:campaignId/links", analyticsController.getCampaignLinkAnalytics);
router.get("/campaign/:campaignId/bounces", analyticsController.getCampaignBounceAnalytics);

// ✅ User-level analytics across campaigns
router.get("/user/summary", analyticsController.getUserSummary);
router.get("/user/campaigns/performance", analyticsController.getUserCampaignPerformance);
router.get("/user/trends", analyticsController.getUserTrends);
router.get("/user/geo", analyticsController.getUserGeoDistribution);
router.get("/user/devices", analyticsController.getUserDeviceDistribution);
router.get("/user/timing", analyticsController.getUserTimingAnalytics);

// ✅ Comparative and advanced analytics
router.get("/compare/campaigns", analyticsController.compareCampaigns);
router.get("/benchmark", analyticsController.getBenchmarks);
router.get("/recommendations", analyticsController.getRecommendations);

module.exports = router;
