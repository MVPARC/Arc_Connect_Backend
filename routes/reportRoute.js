// src/routes/report.routes.js
const express = require("express");
const router = express.Router();
const reportController = require("../controller/reportController");
const auth = require("../middleware/Auth");

// Apply auth middleware to all routes
router.use(auth);

router.get("/", reportController.getAllReports);
router.get("/:campaignId", reportController.getReportForCampaign);
router.get("/:campaignId/opens", reportController.getOpenDetailsByCampaign);
router.put("/:campaignId", reportController.updateReport);
router.get(
  "/:campaignId/analytics/clicks",
  reportController.getCampaignClickAnalytics
);
// Add to routes/report.routes.js
router.get("/dashboard/analytics", reportController.getDashboardAnalytics);
module.exports = router;
