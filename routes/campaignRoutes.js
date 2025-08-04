const express = require("express");
const router = express.Router();
const campaignController = require("../controller/campaignController");
const auth = require("../middleware/Auth");
const { checkCampaignLimit } = require("../middleware/subscriptionMiddleware");

// ✅ Apply authentication middleware to all routes
router.use(auth());

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: Email campaign management
 */

/**
 * @swagger
 * /campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *       400:
 *         description: Validation error or campaign limit exceeded
 */
router.post("/", auth(), checkCampaignLimit, campaignController.createCampaign);

/**
 * @swagger
 * /campaigns:
 *   get:
 *     summary: Get all campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of campaigns
 */
router.get("/", campaignController.getAllCampaigns);

/**
 * @swagger
 * /campaigns/scheduled:
 *   get:
 *     summary: Get all scheduled campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scheduled campaigns
 */
router.get("/scheduled", campaignController.getScheduledCampaigns);

/**
 * @swagger
 * /campaigns/{id}:
 *   get:
 *     summary: Get a specific campaign by ID
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign data
 */
router.get("/:id", campaignController.getCampaign);

/**
 * @swagger
 * /campaigns/{id}:
 *   put:
 *     summary: Update a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign updated
 */
router.put("/:id", campaignController.updateCampaign);

/**
 * @swagger
 * /campaigns/{id}:
 *   delete:
 *     summary: Delete a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign deleted
 */
router.delete("/:id", campaignController.deleteCampaign);

/**
 * @swagger
 * /campaigns/{id}/schedule:
 *   post:
 *     summary: Schedule a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign scheduled
 */
router.post("/:id/schedule", campaignController.scheduleCampaign);

/**
 * @swagger
 * /campaigns/{id}/cancel-schedule:
 *   post:
 *     summary: Cancel a scheduled campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign schedule cancelled
 */
router.post("/:id/cancel-schedule", campaignController.cancelScheduledCampaign);

/**
 * @swagger
 * /campaigns/{id}/send:
 *   post:
 *     summary: Send a campaign immediately
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign sent
 */
router.post("/:id/send", campaignController.sendCampaign);

/**
 * @swagger
 * /campaigns/{id}/status:
 *   get:
 *     summary: Get campaign delivery status
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign status
 */
router.get("/:id/status", campaignController.getCampaignStatus);

module.exports = router;
