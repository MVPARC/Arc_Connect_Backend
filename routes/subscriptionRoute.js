const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/Auth");
const { getUsageStats } = require("../middleware/subscriptionMiddleware");

/**
 * @swagger
 * tags:
 *   name: Subscription
 *   description: User subscription and usage APIs
 */

/**
 * @swagger
 * /subscription/usage:
 *   get:
 *     summary: Get subscription and usage details for the logged-in user
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage statistics returned
 *       401:
 *         description: Unauthorized
 */
router.get("/usage", auth, getUsageStats, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.usageStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching usage statistics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /subscription/upgrade:
 *   post:
 *     summary: Upgrade user subscription plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 example: pro
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Error upgrading subscription
 */
router.post("/upgrade", auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const user = req.user;

    // Update user's subscription
    user.subscription.plan = plan;
    user.subscription.startDate = new Date();
    user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await user.save();

    res.json({
      success: true,
      message: "Subscription updated successfully",
      subscription: user.subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error upgrading subscription",
      error: error.message,
    });
  }
});

module.exports = router;
