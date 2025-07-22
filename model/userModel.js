const mongoose = require("mongoose");

const subscriptionLimits = {
  free: {
    campaigns: {
      total: 10, // Total campaigns allowed in subscription period
      active: 5, // Maximum active campaigns at once
    },
    templates: 10,
    storage: 50, // in MB
    contacts: 500,
  },
  pro: {
    campaigns: {
      total: 20,
      active: 10,
    },
    templates: 20,
    storage: 500, // in MB
    contacts: 5000,
  },
  enterprise: {
    campaigns: {
      total: 100,
      active: 50,
    },
    templates: 100,
    storage: 2048, // in MB (2GB)
    contacts: 100000,
  },
};

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  isVerified: {
    type: Boolean,
    default: false // Default false until email is verified
  },
  password: {
  type: String,
  required: function() {
    return !this.googleId; // Required only if googleId is not present
  }
},

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  googleId: {
    type: String,
    sparse: true,
  },
  
  organization: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Organization",
  required: false
},


 subscription: {
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "expired", "canceled"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: Date,
    usage: {
      campaigns: {
        totalUsed: { type: Number, default: 0 }, // Total campaigns created in subscription period
        activeCount: { type: Number, default: 0 }, // Currently active campaigns
      },
      templates: {
        count: { type: Number, default: 0 },
      },
      storage: {
        used: { type: Number, default: 0 }, // in MB
      },
      contacts: {
        count: { type: Number, default: 0 },
      },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

// Get current subscription limits
userSchema.methods.getCurrentLimits = function () {
  return subscriptionLimits[this.subscription.plan];
};

// Check if resource limit is reached
userSchema.methods.hasReachedLimit = function (
  resourceType,
  subType = "total"
) {
  const currentLimits = this.getCurrentLimits();
  const usage = this.subscription.usage[resourceType];

  switch (resourceType) {
    case "campaigns":
      if (subType === "total") {
        return usage.totalUsed >= currentLimits.campaigns.total;
      }
      return usage.activeCount >= currentLimits.campaigns.active;
    case "templates":
      return usage.count >= currentLimits.templates;
    case "storage":
      return usage.used >= currentLimits.storage;
    case "contacts":
      return usage.count >= currentLimits.contacts;
    default:
      throw new Error("Invalid resource type");
  }
};

// Get remaining quota for a resource
userSchema.methods.getRemainingQuota = function (
  resourceType,
  subType = "total"
) {
  const currentLimits = this.getCurrentLimits();
  const usage = this.subscription.usage[resourceType];

  switch (resourceType) {
    case "campaigns":
      if (subType === "total") {
        return currentLimits.campaigns.total - usage.totalUsed;
      }
      return currentLimits.campaigns.active - usage.activeCount;
    case "templates":
      return currentLimits.templates - usage.count;
    case "storage":
      return currentLimits.storage - usage.used;
    case "contacts":
      return currentLimits.contacts - usage.count;
    default:
      throw new Error("Invalid resource type");
  }
};

// Check if file upload would exceed storage limit
userSchema.methods.wouldExceedStorageLimit = function (fileSize) {
  const currentLimits = this.getCurrentLimits();
  const currentUsage = this.subscription.usage.storage.used;
  const fileSizeInMB = fileSize / (1024 * 1024); // Convert bytes to MB

  return currentUsage + fileSizeInMB > currentLimits.storage;
};

// Update usage counts
userSchema.methods.updateUsage = async function (
  resourceType,
  changeType,
  change
) {
  switch (resourceType) {
    case "campaigns":
      if (changeType === "total") {
        this.subscription.usage.campaigns.totalUsed += change;
      } else if (changeType === "active") {
        this.subscription.usage.campaigns.activeCount += change;
      }
      break;
    case "templates":
      this.subscription.usage.templates.count += change;
      break;
    case "storage":
      this.subscription.usage.storage.used += change;
      break;
    case "contacts":
      this.subscription.usage.contacts.count += change;
      break;
    default:
      throw new Error("Invalid resource type");
  }

  await this.save();
  return this;
};

// Reset usage for new subscription period
userSchema.methods.resetUsage = async function () {
  this.subscription.usage = {
    campaigns: {
      totalUsed: 0,
      activeCount: this.subscription.usage.campaigns.activeCount, // Keep active campaigns count
    },
    templates: {
      count: 0,
    },
    storage: {
      used: this.subscription.usage.storage.used, // Keep storage usage
    },
    contacts: {
      count: 0,
    },
  };

  await this.save();
  return this;
};

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
  subscriptionLimits,
};
