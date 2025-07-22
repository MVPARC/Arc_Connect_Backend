// const express = require("express");
// const router = express.Router();
// const campaignController = require("../controller/campaignController");
// const auth = require("../middleware/Auth");
// const { checkCampaignLimit } = require("../middleware/subscriptionMiddleware");

// // Apply auth middleware to all routes
// router.use(auth);

// // Get all campaigns
// router.get("/", campaignController.getAllCampaigns);

// // Get all scheduled campaigns
// router.get("/scheduled", campaignController.getScheduledCampaigns);

// // Create new campaign - ADD LIMIT CHECK HERE
// router.post("/", checkCampaignLimit, campaignController.createCampaign);

// // Get specific campaign
// router.get("/:id", campaignController.getCampaign);

// // Update campaign
// router.put("/:id", campaignController.updateCampaign);

// // Delete campaign
// router.delete("/:id", campaignController.deleteCampaign);

// // Schedule a campaign
// router.post("/:id/schedule", campaignController.scheduleCampaign);

// // Cancel scheduled campaign
// router.post("/:id/cancel-schedule", campaignController.cancelScheduledCampaign);

// // Send campaign immediately
// router.post("/:id/send", campaignController.sendCampaign);

// // Get campaign status
// router.get("/:id/status", campaignController.getCampaignStatus);

// module.exports = router;

const express = require("express");
const router = express.Router();
const campaignController = require("../controller/campaignController");
const auth = require("../middleware/Auth");
const { checkCampaignLimit } = require("../middleware/subscriptionMiddleware");

// Apply auth middleware to all routes
router.use(auth());

// Add checkCampaignLimit ONLY to route that creates new campaign
router.post("/", auth(), checkCampaignLimit, campaignController.createCampaign);

// Other routes remain unchanged as they don't create new campaigns
router.get("/", campaignController.getAllCampaigns);
router.get("/scheduled", campaignController.getScheduledCampaigns);
router.get("/:id", campaignController.getCampaign);
router.put("/:id", campaignController.updateCampaign);
router.delete("/:id", campaignController.deleteCampaign);
router.post("/:id/schedule", campaignController.scheduleCampaign);
router.post("/:id/cancel-schedule", campaignController.cancelScheduledCampaign);
router.post("/:id/send", campaignController.sendCampaign);
router.get("/:id/status", campaignController.getCampaignStatus);

module.exports = router;