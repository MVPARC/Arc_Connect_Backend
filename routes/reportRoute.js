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

module.exports = router;
