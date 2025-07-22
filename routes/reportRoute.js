const express = require("express");
const router = express.Router();
const reportController = require("../controller/reportController");
const auth = require("../middleware/Auth");

// ✅ Apply auth middleware
router.use(auth());

// ✅ Routes
router.get("/dashboard/analytics", reportController.getDashboardAnalytics);
router.get("/test", (req, res) => res.json({ message: "Report routes working" }));

router.get("/:campaignId/opens", reportController.getOpenDetailsByCampaign);
router.get("/:campaignId/analytics/clicks", reportController.getCampaignClickAnalytics);
router.put("/:campaignId", reportController.updateReport);
router.get("/:campaignId", reportController.getReportForCampaign);
router.get("/", reportController.getAllReports);

module.exports = router;
