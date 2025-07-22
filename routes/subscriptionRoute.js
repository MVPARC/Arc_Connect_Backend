const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/Auth");
const { getUsageStats } = require("../middleware/subscriptionMiddleware");

// Get user's subscription and usage details
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

// Upgrade subscription (placeholder for payment integration)
router.post("/upgrade", auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const user = req.user;

    // Update user's subscription
    user.subscription.plan = plan;
    user.subscription.startDate = new Date();
    // Set end date based on your billing cycle
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