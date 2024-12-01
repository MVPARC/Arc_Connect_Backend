// routes/campaignRoutes.js
const express = require("express");
const router = express.Router();
const campaignController = require("../controller/campaignController");
const auth = require("../middleware/Auth");

// Apply auth middleware to all routes
router.use(auth);

// Get all campaigns
router.get("/", campaignController.getAllCampaigns);

// Get all scheduled campaigns
router.get("/scheduled", campaignController.getScheduledCampaigns);

// Create new campaign
router.post("/", campaignController.createCampaign);

// Get specific campaign
router.get("/:id", campaignController.getCampaign);

// Update campaign
router.put("/:id", campaignController.updateCampaign);

// Delete campaign
router.delete("/:id", campaignController.deleteCampaign);

// Schedule a campaign
router.post("/:id/schedule", campaignController.scheduleCampaign);

// Cancel scheduled campaign
router.post("/:id/cancel-schedule", campaignController.cancelScheduledCampaign);

// Send campaign immediately
router.post("/:id/send", campaignController.sendCampaign);

// Get campaign status
router.get("/:id/status", campaignController.getCampaignStatus);

module.exports = router;
