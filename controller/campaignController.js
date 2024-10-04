// src/controllers/campaign.controller.js
const Campaign = require("../model/campaignModel");
const Email = require("../model/emailModel");
const EmailTemplate = require("../model/emailTemplateModel");
const emailService = require("../mail/mailSender");

// Configuration for email sending
const config = {
  batchSize: 10,
  delayBetweenEmails: 1000, // 1 second
  delayBetweenBatches: 60000, // 1 minute
};

exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().populate("templateId");
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
    scheduledDate: req.body.scheduledDate,
  });

  try {
    const newCampaign = await campaign.save();
    res.status(201).json(newCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getCampaign = async (req, res) => {
  res.json(res.campaign);
};

exports.updateCampaign = async (req, res) => {
  if (req.body.name != null) {
    res.campaign.name = req.body.name;
  }
  if (req.body.subject != null) {
    res.campaign.subject = req.body.subject;
  }
  if (req.body.templateId != null) {
    res.campaign.templateId = req.body.templateId;
  }
  if (req.body.status != null) {
    res.campaign.status = req.body.status;
  }
  if (req.body.scheduledDate != null) {
    res.campaign.scheduledDate = req.body.scheduledDate;
  }

  try {
    const updatedCampaign = await res.campaign.save();
    res.json(updatedCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    await res.campaign.remove();
    res.json({ message: "Campaign deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

exports.sendCampaign = async (req, res) => {
  const { recipients, senderEmail } = req.body;
  const campaign = res.campaign;

  try {
    const emailRecord = await Email.findOne({ email: senderEmail });
    if (!emailRecord) {
      return res.status(404).json({ message: "Sender email not found" });
    }

    const template = await EmailTemplate.findById(campaign.templateId);
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }

    // Update campaign status to 'processing'
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
    res
      .status(500)
      .json({ message: "Error processing campaign", error: error.message });
  }
};

async function processCampaign(campaign, recipients, emailRecord, template) {
  let successCount = 0;
  let failCount = 0;

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
      // Delay between individual emails
      await new Promise((resolve) =>
        setTimeout(resolve, config.delayBetweenEmails)
      );
    }

    // Update campaign progress after each batch
    campaign.progress = {
      successCount,
      failCount,
      totalProcessed: successCount + failCount,
      totalRecipients: recipients.length,
    };
    await campaign.save();

    // Delay between batches
    if (i + config.batchSize < recipients.length) {
      console.log(
        `Batch completed. Waiting for ${
          config.delayBetweenBatches / 1000
        } seconds before next batch...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, config.delayBetweenBatches)
      );
    }
  }

  // Update campaign status when complete
  campaign.status = "completed";
  campaign.progress.totalProcessed = recipients.length;
  await campaign.save();

  console.log(
    `Campaign ${campaign.id} completed. Successes: ${successCount}, Failures: ${failCount}`
  );
}

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

exports.getCampaignStatus = async (req, res) => {
  const campaignId = req.params.id;

  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    res.json({
      campaignId: campaign.id,
      status: campaign.status,
      progress: campaign.progress,
    });
  } catch (error) {
    console.error("Error getting campaign status:", error);
    res.status(500).json({
      message: "Error retrieving campaign status",
      error: error.message,
    });
  }
};
