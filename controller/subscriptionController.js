// controllers/subscriptionController.js
exports.getSubscriptionUsage = async (req, res) => {
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
};

exports.upgradeSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = req.user;

    user.subscription.plan = plan;
    user.subscription.startDate = new Date();
    user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
};

exports.cancelSubscription = async (req, res) => {
  try {
    const user = req.user;
    user.subscription.status = "canceled";
    await user.save();

    res.json({
      success: true,
      message: "Subscription canceled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error canceling subscription",
      error: error.message,
    });
  }
};
