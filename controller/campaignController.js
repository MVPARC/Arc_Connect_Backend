// controllers/campaignController.js
const Campaign = require("../model/campaignModel");
const Email = require("../model/emailModel");
const EmailTemplate = require("../model/emailTemplateModel");
const RecipientList = require("../model/recipientModel");
const emailService = require("../mail/mailSender");
const schedulerService = require("../services/scheduleService");

// Configuration for email sending
const config = {
  batchSize: 10,
  delayBetweenEmails: 1000, // 1 second
  delayBetweenBatches: 60000, // 1 minute
};

const campaignController = {
  // getAllCampaigns: async (req, res) => {
  //   try {
  //     const campaigns = await Campaign.find({ user: req.user._id })
  //       .populate("templateId")
  //       .populate("senderEmail")
  //       .populate("recipientLists")
  //       .sort({ createdAt: -1 });
  //     res.json(campaigns);
  //   } catch (err) {
  //     res.status(500).json({ message: err.message });
  //   }
  // },
  getAllCampaigns: async (req, res) => {
    try {
      const campaigns = await Campaign.find({ user: req.user._id })
        .populate("templateId")
        .populate("senderEmail")
        .populate("recipientLists")
        .sort({ createdAt: -1 });

      // Add usage stats to response
      res.json({
        campaigns,
        usage: {
          total: {
            used: req.user.subscription.usage.campaigns.totalUsed,
            limit: req.user.getCurrentLimits().campaigns.total,
            remaining: await req.user.getRemainingQuota("campaigns", "total"),
          },
          active: {
            used: req.user.subscription.usage.campaigns.activeCount,
            limit: req.user.getCurrentLimits().campaigns.active,
            remaining: await req.user.getRemainingQuota("campaigns", "active"),
          },
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  getScheduledCampaigns: async (req, res) => {
    try {
      const campaigns = await Campaign.find({
        user: req.user._id,
        status: "scheduled",
        scheduledDate: { $gt: new Date() },
      })
        .populate("templateId")
        .populate("senderEmail")
        .populate("recipientLists")
        .sort({ scheduledDate: 1 });
      res.json(campaigns);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  createCampaign: async (req, res) => {
    try {
      const {
        name,
        subject,
        templateId,
        senderEmailId,
        scheduledDate,
        recipients,
        recipientListIds,
      } = req.body;

      // Create campaign with user reference
      const campaign = new Campaign({
        name,
        subject,
        templateId,
        senderEmail: senderEmailId,
        scheduledDate,
        user: req.user._id,
        status: scheduledDate ? "scheduled" : "draft",
        recipients: recipients || [],
        recipientLists: recipientListIds || [],
        progress: {
          successCount: 0,
          failCount: 0,
          totalProcessed: 0,
          totalRecipients: 0,
        },
      });

      const newCampaign = await campaign.save();

      // Update user's campaign usage counts
      await req.user.updateUsage("campaigns", "total", 1);
      await req.user.updateUsage("campaigns", "active", 1);

      if (scheduledDate && new Date(scheduledDate) > new Date()) {
        await schedulerService.scheduleCampaign(newCampaign);
      }

      const populatedCampaign = await Campaign.findById(newCampaign._id)
        .populate("templateId")
        .populate("senderEmail")
        .populate("recipientLists");

      // Return campaign with usage stats
      res.status(201).json({
        campaign: populatedCampaign,
        usage: {
          total: {
            used: req.user.subscription.usage.campaigns.totalUsed,
            limit: req.user.getCurrentLimits().campaigns.total,
            remaining: await req.user.getRemainingQuota("campaigns", "total"),
          },
          active: {
            used: req.user.subscription.usage.campaigns.activeCount,
            limit: req.user.getCurrentLimits().campaigns.active,
            remaining: await req.user.getRemainingQuota("campaigns", "active"),
          },
        },
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  // createCampaign: async (req, res) => {
  //   try {
  //     const {
  //       name,
  //       subject,
  //       templateId,
  //       senderEmailId,
  //       scheduledDate,
  //       recipients,
  //       recipientListIds,
  //     } = req.body;

  //     // Create campaign with user reference
  //     const campaign = new Campaign({
  //       name,
  //       subject,
  //       templateId,
  //       senderEmail: senderEmailId,
  //       scheduledDate,
  //       user: req.user._id,
  //       status: scheduledDate ? "scheduled" : "draft",
  //       recipients: recipients || [],
  //       recipientLists: recipientListIds || [],
  //       progress: {
  //         successCount: 0,
  //         failCount: 0,
  //         totalProcessed: 0,
  //         totalRecipients: 0,
  //       },
  //     });

  //     const newCampaign = await campaign.save();

  //     if (scheduledDate && new Date(scheduledDate) > new Date()) {
  //       await schedulerService.scheduleCampaign(newCampaign);
  //     }

  //     const populatedCampaign = await Campaign.findById(newCampaign._id)
  //       .populate("templateId")
  //       .populate("senderEmail")
  //       .populate("recipientLists");

  //     res.status(201).json(populatedCampaign);
  //   } catch (err) {
  //     res.status(400).json({ message: err.message });
  //   }
  // },

  getCampaign: async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        user: req.user._id,
      })
        .populate("templateId")
        .populate("senderEmail")
        .populate("recipientLists");

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  updateCampaign: async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status === "sending") {
        return res.status(400).json({
          message: "Cannot update campaign while it is in progress",
        });
      }

      const allowedUpdates = [
        "name",
        "subject",
        "templateId",
        "senderEmailId",
        "scheduledDate",
        "recipients",
        "recipientListIds",
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] != null) {
          if (field === "senderEmailId") {
            campaign.senderEmail = req.body[field];
          } else if (field === "recipientListIds") {
            campaign.recipientLists = req.body[field];
          } else {
            campaign[field] = req.body[field];
          }
        }
      });

      if (req.body.scheduledDate) {
        const scheduleDate = new Date(req.body.scheduledDate);
        if (scheduleDate <= new Date()) {
          return res.status(400).json({
            message: "Scheduled date must be in the future",
          });
        }
        campaign.scheduledDate = scheduleDate;
        campaign.status = "scheduled";
        await schedulerService.scheduleCampaign(campaign);
      }

      const updatedCampaign = await campaign.save();
      const populatedCampaign = await Campaign.findById(updatedCampaign._id)
        .populate("templateId")
        .populate("senderEmail")
        .populate("recipientLists");

      res.json(populatedCampaign);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  deleteCampaign: async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status === "sending") {
        return res.status(400).json({
          message: "Cannot delete campaign while it is in progress",
        });
      }

      if (campaign.status === "scheduled") {
        schedulerService.cancelScheduledCampaign(campaign._id.toString());
      }

      await campaign.remove();

      // Only decrease active count, total remains unchanged
      await req.user.updateUsage("campaigns", "active", -1);

      res.json({
        message: "Campaign deleted successfully",
        usage: {
          total: {
            used: req.user.subscription.usage.campaigns.totalUsed,
            limit: req.user.getCurrentLimits().campaigns.total,
            remaining: await req.user.getRemainingQuota("campaigns", "total"),
          },
          active: {
            used: req.user.subscription.usage.campaigns.activeCount,
            limit: req.user.getCurrentLimits().campaigns.active,
            remaining: await req.user.getRemainingQuota("campaigns", "active"),
          },
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // deleteCampaign: async (req, res) => {
  //   try {
  //     const campaign = await Campaign.findOne({
  //       _id: req.params.id,
  //       user: req.user._id,
  //     });

  //     if (!campaign) {
  //       return res.status(404).json({ message: "Campaign not found" });
  //     }

  //     if (campaign.status === "sending") {
  //       return res.status(400).json({
  //         message: "Cannot delete campaign while it is in progress",
  //       });
  //     }

  //     if (campaign.status === "scheduled") {
  //       schedulerService.cancelScheduledCampaign(campaign._id.toString());
  //     }

  //     await campaign.remove();
  //     res.json({ message: "Campaign deleted successfully" });
  //   } catch (err) {
  //     res.status(500).json({ message: err.message });
  //   }
  // },

  scheduleCampaign: async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const {
        scheduledDate,
        recipients = [],
        recipientListIds = [],
        senderEmailId,
      } = req.body;

      const scheduleTime = new Date(scheduledDate);
      if (scheduleTime <= new Date()) {
        return res.status(400).json({
          message: "Scheduled date must be in the future",
        });
      }

      // Validate sender email
      const emailExists = await Email.findById(senderEmailId);
      if (!emailExists) {
        return res.status(404).json({ message: "Sender email not found" });
      }

      // Collect all recipients
      let allRecipients = [...recipients];

      // Add recipients from lists if any
      if (recipientListIds.length > 0) {
        const recipientLists = await RecipientList.find({
          _id: { $in: recipientListIds },
          user: req.user._id,
        });

        for (const list of recipientLists) {
          const formattedRecipients = list.recipients.map((r) => ({
            email: r.email,
            name: r.name,
            id: r._id.toString(),
          }));
          allRecipients.push(...formattedRecipients);
        }
      }

      // Remove duplicates
      allRecipients = allRecipients.filter(
        (recipient, index, self) =>
          index === self.findIndex((r) => r.email === recipient.email)
      );

      if (allRecipients.length === 0) {
        return res.status(400).json({
          message:
            "No recipients found. Please provide recipients or valid recipient lists.",
        });
      }

      // Update campaign
      campaign.scheduledDate = scheduleTime;
      campaign.status = "scheduled";
      campaign.senderEmail = senderEmailId;
      campaign.recipients = allRecipients;
      campaign.recipientLists = recipientListIds;
      campaign.progress = {
        successCount: 0,
        failCount: 0,
        totalProcessed: 0,
        totalRecipients: allRecipients.length,
      };

      await campaign.save();
      await schedulerService.scheduleCampaign(campaign);

      const populatedCampaign = await Campaign.findById(campaign._id)
        .populate("templateId")
        .populate("senderEmail")
        .populate("recipientLists");

      res.json({
        message: "Campaign scheduled successfully",
        campaign: populatedCampaign,
      });
    } catch (error) {
      console.error("Error scheduling campaign:", error);
      res.status(500).json({
        message: "Error scheduling campaign",
        error: error.message,
      });
    }
  },

  sendCampaign: async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status === "sending") {
        return res
          .status(400)
          .json({ message: "Campaign is already in progress" });
      }

      const {
        recipients = [],
        recipientListIds = [],
        senderEmailId,
      } = req.body;

      // Validate and update sender email if provided
      if (senderEmailId) {
        const emailRecord = await Email.findById(senderEmailId);
        if (!emailRecord) {
          return res.status(404).json({ message: "Sender email not found" });
        }
        campaign.senderEmail = senderEmailId;
      } else if (!campaign.senderEmail) {
        return res.status(400).json({ message: "Sender email is required" });
      }

      // Get sender email record
      const emailRecord = await Email.findById(campaign.senderEmail);
      if (!emailRecord) {
        return res.status(404).json({ message: "Sender email not found" });
      }

      // Get template
      const template = await EmailTemplate.findById(campaign.templateId);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }

      // Collect all recipients
      let allRecipients = [...recipients];

      // Add recipients from lists if any
      if (recipientListIds.length > 0) {
        const recipientLists = await RecipientList.find({
          _id: { $in: recipientListIds },
          user: req.user._id,
        });

        for (const list of recipientLists) {
          const formattedRecipients = list.recipients.map((r) => ({
            email: r.email,
            name: r.name,
            id: r._id.toString(),
          }));
          allRecipients.push(...formattedRecipients);
        }
      }

      // Remove duplicates
      allRecipients = allRecipients.filter(
        (recipient, index, self) =>
          index === self.findIndex((r) => r.email === recipient.email)
      );

      if (allRecipients.length === 0) {
        return res.status(400).json({
          message:
            "No recipients found. Please provide recipients or valid recipient lists.",
        });
      }

      // Update campaign
      campaign.status = "sending";
      campaign.recipients = allRecipients;
      campaign.recipientLists = recipientListIds;
      campaign.progress = {
        successCount: 0,
        failCount: 0,
        totalProcessed: 0,
        totalRecipients: allRecipients.length,
      };
      await campaign.save();

      // Respond immediately
      res.json({
        message: "Campaign processing started",
        campaignId: campaign.id,
        totalRecipients: allRecipients.length,
        estimatedTime: calculateEstimatedTime(allRecipients.length),
      });

      // Process emails in background
      processCampaign(campaign, allRecipients, emailRecord, template);
    } catch (error) {
      console.error("Error in sendCampaign:", error);
      res.status(500).json({
        message: "Error processing campaign",
        error: error.message,
      });
    }
  },

  cancelScheduledCampaign: async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status !== "scheduled") {
        return res.status(400).json({ message: "Campaign is not scheduled" });
      }

      schedulerService.cancelScheduledCampaign(campaign._id.toString());

      campaign.status = "cancelled";
      campaign.scheduledDate = null;
      await campaign.save();

      res.json({ message: "Campaign schedule cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling scheduled campaign:", error);
      res.status(500).json({
        message: "Error cancelling campaign schedule",
        error: error.message,
      });
    }
  },

  getCampaignStatus: async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        user: req.user._id,
      })
        .populate("templateId")
        .populate("senderEmail")
        .populate("recipientLists");

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json({
        campaignId: campaign.id,
        name: campaign.name,
        status: campaign.status,
        progress: campaign.progress,
        scheduledDate: campaign.scheduledDate,
        senderEmail: campaign.senderEmail,
        template: campaign.templateId,
        recipientLists: campaign.recipientLists,
        completedAt: campaign.completedAt,
        errorMessage: campaign.errorMessage,
      });
    } catch (error) {
      console.error("Error getting campaign status:", error);
      res.status(500).json({
        message: "Error retrieving campaign status",
        error: error.message,
      });
    }
  },
};

// Helper function to process campaign emails
async function processCampaign(campaign, recipients, emailRecord, template) {
  let successCount = 0;
  let failCount = 0;

  try {
    for (let i = 0; i < recipients.length; i += config.batchSize) {
      const batch = recipients.slice(
        i,
        Math.min(i + config.batchSize, recipients.length)
      );

      for (const recipient of batch) {
        try {
          await emailService.sendEmail(
            emailRecord.email,
            recipient.email,
            campaign.subject,
            template.content,
            recipient,
            campaign.id,
            emailRecord.password
          );
          successCount++;
        } catch (error) {
          console.error(`Error sending email to ${recipient.email}:`, error);
          failCount++;
        }

        // Update progress after each email
        campaign.progress = {
          successCount,
          failCount,
          totalProcessed: successCount + failCount,
          totalRecipients: recipients.length,
        };
        await campaign.save();

        // Delay between individual emails
        await new Promise((resolve) =>
          setTimeout(resolve, config.delayBetweenEmails)
        );
      }

      // Delay between batches
      if (i + config.batchSize < recipients.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.delayBetweenBatches)
        );
      }
    }

    // Update campaign status when complete
    campaign.status = "completed";
    campaign.completedAt = new Date();
    await campaign.save();

    console.log(
      `Campaign ${campaign.id} completed. Successes: ${successCount}, Failures: ${failCount}`
    );
  } catch (error) {
    console.error(`Error processing campaign ${campaign.id}:`, error);
    campaign.status = "failed";
    campaign.errorMessage = error.message;
    await campaign.save();
  }
}

// Helper function to calculate estimated time
function calculateEstimatedTime(totalRecipients) {
  const totalBatches = Math.ceil(totalRecipients / config.batchSize);
  const totalSeconds =
    (totalBatches - 1) *
      (config.batchSize * (config.delayBetweenEmails / 1000) +
        config.delayBetweenBatches / 1000) +
    (totalRecipients % config.batchSize || config.batchSize) *
      (config.delayBetweenEmails / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${hours}h ${minutes}m ${seconds}s`;
}

module.exports = campaignController;
