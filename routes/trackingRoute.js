const express = require("express");
const router = express.Router();
const trackerController = require("../controller/tracker");

/**
 * @swagger
 * tags:
 *   name: Tracking
 *   description: Email open and click tracking
 */

/**
 * @swagger
 * /track/{campaignId}/{recipientId}:
 *   get:
 *     summary: Track email open
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the campaign
 *       - in: path
 *         name: recipientId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the recipient
 *     responses:
 *       200:
 *         description: Open tracked successfully (returns image pixel)
 *       400:
 *         description: Invalid IDs
 */
router.get("/:campaignId/:recipientId", trackerController.trackOpen);

/**
 * @swagger
 * /track/click/{campaignId}/{recipientId}/{linkId}:
 *   get:
 *     summary: Track link click
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the campaign
 *       - in: path
 *         name: recipientId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the recipient
 *       - in: path
 *         name: linkId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the clicked link
 *     responses:
 *       302:
 *         description: Redirects to the original link
 *       400:
 *         description: Invalid IDs or tracking error
 */
router.get(
  "/click/:campaignId/:recipientId/:linkId",
  trackerController.trackClick
);

module.exports = router;
