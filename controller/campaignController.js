// // src/controllers/campaign.controller.js
// const Campaign = require("../model/campaignModel");
// const Email = require("../model/emailModel");
// const EmailTemplate = require("../model/emailTemplateModel");
// const emailService = require("../mail/mailSender");

// // Configuration for email sending
// const config = {
//   batchSize: 10,
//   delayBetweenEmails: 1000, // 1 second
//   delayBetweenBatches: 60000, // 1 minute
// };

// exports.getAllCampaigns = async (req, res) => {
//   try {
//     const campaigns = await Campaign.find().populate("templateId");
//     res.json(campaigns);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.createCampaign = async (req, res) => {
//   const campaign = new Campaign({
//     name: req.body.name,
//     subject: req.body.subject,
//     templateId: req.body.templateId,
//     scheduledDate: req.body.scheduledDate,
//   });

//   try {
//     const newCampaign = await campaign.save();
//     res.status(201).json(newCampaign);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

// exports.getCampaign = async (req, res) => {
//   res.json(res.campaign);
// };

// exports.updateCampaign = async (req, res) => {
//   if (req.body.name != null) {
//     res.campaign.name = req.body.name;
//   }
//   if (req.body.subject != null) {
//     res.campaign.subject = req.body.subject;
//   }
//   if (req.body.templateId != null) {
//     res.campaign.templateId = req.body.templateId;
//   }
//   if (req.body.status != null) {
//     res.campaign.status = req.body.status;
//   }
//   if (req.body.scheduledDate != null) {
//     res.campaign.scheduledDate = req.body.scheduledDate;
//   }

//   try {
//     const updatedCampaign = await res.campaign.save();
//     res.json(updatedCampaign);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

// exports.deleteCampaign = async (req, res) => {
//   try {
//     await res.campaign.remove();
//     res.json({ message: "Campaign deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getCampaignMiddleware = async (req, res, next) => {
//   let campaign;
//   try {
//     campaign = await Campaign.findById(req.params.id);
//     if (campaign == null) {
//       return res.status(404).json({ message: "Cannot find campaign" });
//     }
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }

//   res.campaign = campaign;
//   next();
// };

// exports.sendCampaign = async (req, res) => {
//   const { recipients, senderEmail } = req.body;
//   const campaign = res.campaign;

//   try {
//     const emailRecord = await Email.findOne({ email: senderEmail });
//     if (!emailRecord) {
//       return res.status(404).json({ message: "Sender email not found" });
//     }

//     const template = await EmailTemplate.findById(campaign.templateId);
//     if (!template) {
//       return res.status(404).json({ message: "Email template not found" });
//     }

//     // Update campaign status to 'processing'
//     campaign.status = "sending";
//     campaign.progress = {
//       successCount: 0,
//       failCount: 0,
//       totalProcessed: 0,
//       totalRecipients: recipients.length,
//     };
//     await campaign.save();

//     // Respond immediately
//     res.json({
//       message: "Campaign processing started",
//       campaignId: campaign.id,
//       estimatedTime: calculateEstimatedTime(recipients.length),
//     });

//     // Process emails in background
//     processCampaign(campaign, recipients, emailRecord, template);
//   } catch (error) {
//     console.error("Error in sendCampaign:", error);
//     res
//       .status(500)
//       .json({ message: "Error processing campaign", error: error.message });
//   }
// };

// async function processCampaign(campaign, recipients, emailRecord, template) {
//   let successCount = 0;
//   let failCount = 0;

//   for (let i = 0; i < recipients.length; i += config.batchSize) {
//     const batch = recipients.slice(
//       i,
//       Math.min(i + config.batchSize, recipients.length)
//     );

//     for (const recipient of batch) {
//       try {
//         await emailService.sendEmail(
//           emailRecord.email,
//           recipient.email,
//           campaign.subject,
//           template.content,
//           recipient,
//           campaign.id,
//           emailRecord.password
//         );
//         successCount++;
//       } catch (error) {
//         console.error(`Error sending email to ${recipient.email}:`, error);
//         failCount++;
//       }
//       // Delay between individual emails
//       await new Promise((resolve) =>
//         setTimeout(resolve, config.delayBetweenEmails)
//       );
//     }

//     // Update campaign progress after each batch
//     campaign.progress = {
//       successCount,
//       failCount,
//       totalProcessed: successCount + failCount,
//       totalRecipients: recipients.length,
//     };
//     await campaign.save();

//     // Delay between batches
//     if (i + config.batchSize < recipients.length) {
//       console.log(
//         `Batch completed. Waiting for ${
//           config.delayBetweenBatches / 1000
//         } seconds before next batch...`
//       );
//       await new Promise((resolve) =>
//         setTimeout(resolve, config.delayBetweenBatches)
//       );
//     }
//   }

//   // Update campaign status when complete
//   campaign.status = "completed";
//   campaign.progress.totalProcessed = recipients.length;
//   await campaign.save();

//   console.log(
//     `Campaign ${campaign.id} completed. Successes: ${successCount}, Failures: ${failCount}`
//   );
// }

// function calculateEstimatedTime(totalRecipients) {
//   const totalBatches = Math.ceil(totalRecipients / config.batchSize);
//   const totalSeconds =
//     (totalBatches - 1) *
//       (config.batchSize * (config.delayBetweenEmails / 1000) +
//         config.delayBetweenBatches / 1000) +
//     (totalRecipients % config.batchSize || config.batchSize) *
//       (config.delayBetweenEmails / 1000);

//   const hours = Math.floor(totalSeconds / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   const seconds = Math.floor(totalSeconds % 60);

//   return `${hours}h ${minutes}m ${seconds}s`;
// }

// exports.getCampaignStatus = async (req, res) => {
//   const campaignId = req.params.id;

//   try {
//     const campaign = await Campaign.findById(campaignId);
//     if (!campaign) {
//       return res.status(404).json({ message: "Campaign not found" });
//     }

//     res.json({
//       campaignId: campaign.id,
//       status: campaign.status,
//       progress: campaign.progress,
//     });
//   } catch (error) {
//     console.error("Error getting campaign status:", error);
//     res.status(500).json({
//       message: "Error retrieving campaign status",
//       error: error.message,
//     });
//   }
// };
// src/controllers/campaignController.js

// src/controllers/campaign.controller.js
// src/controllers/campaign.controller.js
const Campaign = require("../model/campaignModel");
const Email = require("../model/emailModel");
const EmailTemplate = require("../model/emailTemplateModel");
const emailService = require("../mail/mailSender");
const schedulerService = require("../services/scheduleService");

// Configuration for email sending
const config = {
  batchSize: 10,
  delayBetweenEmails: 1000, // 1 second
  delayBetweenBatches: 60000, // 1 minute
};

exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate("templateId")
      .populate("senderEmail")
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getScheduledCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      status: "scheduled",
      scheduledDate: { $gt: new Date() },
    })
      .populate("templateId")
      .populate("senderEmail")
      .sort({ scheduledDate: 1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCampaign = async (req, res) => {
  const campaign = new Campaign({
    name: req.body.name,
    subject: req.body.subject,
    templateId: req.body.templateId,
    senderEmail: req.body.senderEmailId,
    scheduledDate: req.body.scheduledDate,
    status: req.body.scheduledDate ? "scheduled" : "draft",
    progress: {
      successCount: 0,
      failCount: 0,
      totalProcessed: 0,
      totalRecipients: 0,
    },
  });

  try {
    const newCampaign = await campaign.save();

    // If scheduledDate is provided, schedule the campaign
    if (
      req.body.scheduledDate &&
      new Date(req.body.scheduledDate) > new Date()
    ) {
      await schedulerService.scheduleCampaign(newCampaign);
    }

    const populatedCampaign = await Campaign.findById(newCampaign._id)
      .populate("templateId")
      .populate("senderEmail");

    res.status(201).json(populatedCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate("templateId")
      .populate("senderEmail");
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Only allow updates if campaign is not in progress
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
    ];

    // Update fields if provided
    allowedUpdates.forEach((field) => {
      if (req.body[field] != null) {
        if (field === "senderEmailId") {
          campaign.senderEmail = req.body[field];
        } else {
          campaign[field] = req.body[field];
        }
      }
    });

    // Handle scheduling logic
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
      .populate("senderEmail");

    res.json(populatedCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    // Don't allow deletion of campaigns in progress
    if (res.campaign.status === "sending") {
      return res.status(400).json({
        message: "Cannot delete campaign while it is in progress",
      });
    }

    // Cancel scheduled job if exists
    if (res.campaign.status === "scheduled") {
      schedulerService.cancelScheduledCampaign(res.campaign._id.toString());
    }

    await res.campaign.remove();
    res.json({ message: "Campaign deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.scheduleCampaign = async (req, res) => {
  try {
    const campaign = res.campaign;
    const { scheduledDate, recipients, senderEmailId } = req.body;

    // Validate scheduled date
    const scheduleTime = new Date(scheduledDate);
    if (scheduleTime <= new Date()) {
      return res
        .status(400)
        .json({ message: "Scheduled date must be in the future" });
    }

    // Validate sender email exists
    const emailExists = await Email.findById(senderEmailId);
    if (!emailExists) {
      return res.status(404).json({ message: "Sender email not found" });
    }

    // Update campaign details
    campaign.scheduledDate = scheduleTime;
    campaign.status = "scheduled";
    campaign.senderEmail = senderEmailId;
    campaign.recipients = recipients; 

    campaign.progress = {
      successCount: 0,
      failCount: 0,
      totalProcessed: 0,
      totalRecipients: recipients ? recipients.length : 0,
    };

    await campaign.save();

    // Schedule the campaign
    await schedulerService.scheduleCampaign(campaign);

    const populatedCampaign = await Campaign.findById(campaign._id)
      .populate("templateId")
      .populate("senderEmail");

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
};

exports.cancelScheduledCampaign = async (req, res) => {
  try {
    const campaign = res.campaign;

    if (campaign.status !== "scheduled") {
      return res.status(400).json({ message: "Campaign is not scheduled" });
    }

    // Cancel the scheduled job
    schedulerService.cancelScheduledCampaign(campaign._id.toString());

    // Update campaign status
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
};

exports.sendCampaign = async (req, res) => {
  try {
    const { recipients, senderEmailId } = req.body;
    const campaign = res.campaign;

    // Don't allow sending if already in progress
    if (campaign.status === "sending") {
      return res
        .status(400)
        .json({ message: "Campaign is already in progress" });
    }

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

    const template = await EmailTemplate.findById(campaign.templateId);
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }

    // Validate recipients
    if (!recipients || !recipients.length) {
      return res.status(400).json({ message: "Recipients are required" });
    }

    // Update campaign status to 'sending'
    campaign.status = "sending";
    campaign.progress = {
      successCount: 0,
      failCount: 0,
      totalProcessed: 0,
      totalRecipients: recipients.length,
    };
    await campaign.save();

    // Respond immediately
    res.json({
      message: "Campaign processing started",
      campaignId: campaign.id,
      estimatedTime: calculateEstimatedTime(recipients.length),
    });

    // Process emails in background
    processCampaign(campaign, recipients, emailRecord, template);
  } catch (error) {
    console.error("Error in sendCampaign:", error);
    res.status(500).json({
      message: "Error processing campaign",
      error: error.message,
    });
  }
};

exports.getCampaignMiddleware = async (req, res, next) => {
  let campaign;
  try {
    campaign = await Campaign.findById(req.params.id);
    if (campaign == null) {
      return res.status(404).json({ message: "Cannot find campaign" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.campaign = campaign;
  next();
};

exports.getCampaignStatus = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate("templateId")
      .populate("senderEmail");

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

// module.exports = {
//   getAllCampaigns,
//   getScheduledCampaigns,
//   createCampaign,
//   getCampaign,
//   updateCampaign,
//   deleteCampaign,
//   scheduleCampaign,
//   cancelScheduledCampaign,
//   sendCampaign,
//   getCampaignStatus,
//   getCampaignMiddleware,
// };
