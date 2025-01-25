const createError = require("http-errors");

// Generic subscription check middleware creator
const checkSubscriptionLimit = (resourceType) => async (req, res, next) => {
  try {
    const user = req.user;

    // Check if user's subscription is active
    if (user.subscription.status !== "active") {
      throw createError(403, "Your subscription is not active");
    }

    // For campaigns, check total limit
    if (resourceType === "campaigns") {
      if (await user.hasReachedLimit("campaigns", "total")) {
        throw createError(
          403,
          `You have reached your ${resourceType} limit for this subscription period`
        );
      }
    } else if (await user.hasReachedLimit(resourceType)) {
      throw createError(403, `You have reached your ${resourceType} limit`);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Specific middleware for each resource type
const checkCampaignLimit = checkSubscriptionLimit("campaigns");
const checkTemplateLimit = checkSubscriptionLimit("templates");
const checkContactLimit = checkSubscriptionLimit("contacts");

// Special middleware for storage checks
const checkStorageLimit = async (req, res, next) => {
  try {
    const user = req.user;

    // Check subscription status
    if (user.subscription.status !== "active") {
      throw createError(403, "Your subscription is not active");
    }

    // Check single file upload
    if (req.file && user.wouldExceedStorageLimit(req.file.size)) {
      throw createError(403, "This upload would exceed your storage limit");
    }

    // Check multiple files upload
    if (req.files) {
      const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
      if (user.wouldExceedStorageLimit(totalSize)) {
        throw createError(403, "This upload would exceed your storage limit");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to get usage stats
const getUsageStats = async (req, res, next) => {
  try {
    const user = req.user;
    const currentLimits = user.getCurrentLimits();
    const usage = user.subscription.usage;

    req.usageStats = {
      subscription: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
      },
      usage: {
        campaigns: {
          total: {
            used: usage.campaigns.totalUsed,
            limit: currentLimits.campaigns.total,
            remaining:
              currentLimits.campaigns.total - usage.campaigns.totalUsed,
          },
          active: {
            used: usage.campaigns.activeCount,
            limit: currentLimits.campaigns.active,
            remaining:
              currentLimits.campaigns.active - usage.campaigns.activeCount,
          },
        },
        templates: {
          used: usage.templates.count,
          limit: currentLimits.templates,
          remaining: currentLimits.templates - usage.templates.count,
        },
        storage: {
          used: usage.storage.used,
          limit: currentLimits.storage,
          remaining: currentLimits.storage - usage.storage.used,
        },
        contacts: {
          used: usage.contacts.count,
          limit: currentLimits.contacts,
          remaining: currentLimits.contacts - usage.contacts.count,
        },
      },
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkCampaignLimit,
  checkTemplateLimit,
  checkContactLimit,
  checkStorageLimit,
  getUsageStats,
};
