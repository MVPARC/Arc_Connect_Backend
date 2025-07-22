// src/services/schedulerService.js
/*const schedule = require("node-schedule");
const Campaign = require("../../model/campaignModel");
const Email = require("../../model/emailModel");
const EmailTemplate = require("../../model/emailTemplateModel");
const emailService = require("../../mail/mailSender");

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.initializeScheduledCampaigns();
  }

  async initializeScheduledCampaigns() {
    try {
      // Fetch all scheduled campaigns that haven't been sent
      const scheduledCampaigns = await Campaign.find({
        status: "scheduled",
        scheduledDate: { $gt: new Date() },
      })
        .populate("senderEmail")
        .populate("templateId");

      // Schedule each campaign
      for (const campaign of scheduledCampaigns) {
        await this.scheduleCampaign(campaign);
      }

      console.log(
        `Initialized ${scheduledCampaigns.length} scheduled campaigns`
      );
    } catch (error) {
      console.error("Error initializing scheduled campaigns:", error);
    }
  }

  async scheduleCampaign(campaign) {
    try {
      // Cancel existing job if it exists
      if (this.jobs.has(campaign._id.toString())) {
        this.jobs.get(campaign._id.toString()).cancel();
      }

      if (campaign.recipients && campaign.recipients.length > 0) {
        await Campaign.findByIdAndUpdate(campaign._id, {
          recipients: campaign.recipients,
        });
      }

      // Create a rule object for IST timezone
      const rule = new schedule.RecurrenceRule();
      rule.tz = "Asia/Kolkata"; // Set timezone to IST

      // Convert the date to IST
      const scheduledDate = new Date(campaign.scheduledDate);

      // Set all components of the rule
      rule.year = scheduledDate.getFullYear();
      rule.month = scheduledDate.getMonth();
      rule.date = scheduledDate.getDate();
      rule.hour = scheduledDate.getHours();
      rule.minute = scheduledDate.getMinutes();
      rule.second = scheduledDate.getSeconds();

      console.log("Scheduling campaign in IST:", {
        campaignId: campaign._id,
        scheduledTime: scheduledDate.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
        year: rule.year,
        month: rule.month + 1, // Adding 1 as months are 0-based
        date: rule.date,
        hour: rule.hour,
        minute: rule.minute,
        second: rule.second,
      });

      // Schedule new job using the IST rule
      const job = schedule.scheduleJob(rule, async () => {
        try {
          // Fetch fresh campaign data
          const freshCampaign = await Campaign.findById(campaign._id)
            .populate("templateId")
            .populate("senderEmail");

          if (!freshCampaign || freshCampaign.status !== "scheduled") {
            return;
          }

          // Verify all required data exists
          if (!freshCampaign.senderEmail || !freshCampaign.templateId) {
            throw new Error(
              "Missing required campaign components (sender email or template)"
            );
          }

          // Update campaign status to sending
          freshCampaign.status = "sending";
          freshCampaign.progress = {
            successCount: 0,
            failCount: 0,
            totalProcessed: 0,
            totalRecipients: 0, // Will be updated when processing starts
          };
          await freshCampaign.save();

          // Process the campaign
          await this.processCampaign(freshCampaign);

          // Cleanup
          this.jobs.delete(campaign._id.toString());
        } catch (error) {
          console.error(
            `Error executing scheduled campaign ${campaign._id}:`,
            error
          );
          // Update campaign status to failed
          await Campaign.findByIdAndUpdate(campaign._id, {
            status: "failed",
            errorMessage: error.message,
          });
        }
      });

      // Store job reference
      this.jobs.set(campaign._id.toString(), job);

      // Log next invocation time
      if (job.nextInvocation()) {
        console.log(
          "Next execution time (IST):",
          job
            .nextInvocation()
            .toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        );
      }

      return true;
    } catch (error) {
      console.error("Error scheduling campaign:", error);
      throw error;
    }
  }

  // Helper function to process campaign emails
  async processCampaign(campaign) {
    const config = {
      batchSize: 10,
      delayBetweenEmails: 1000,
      delayBetweenBatches: 60000,
    };

    let successCount = 0;
    let failCount = 0;

    try {
      if (!campaign.recipients || !campaign.recipients.length) {
        throw new Error("No recipients found for campaign");
      }

      const recipients = campaign.recipients;
      campaign.progress.totalRecipients = recipients.length;
      await campaign.save();

      for (let i = 0; i < recipients.length; i += config.batchSize) {
        const batch = recipients.slice(
          i,
          Math.min(i + config.batchSize, recipients.length)
        );

        for (const recipient of batch) {
          try {
            await emailService.sendEmail(
              campaign.senderEmail.email,
              recipient.email,
              campaign.subject,
              campaign.templateId.content,
              recipient,
              campaign.id,
              campaign.senderEmail.password
            );
            successCount++;
          } catch (error) {
            console.error(`Error sending email to ${recipient.email}:`, error);
            failCount++;
          }

          // Update progress
          campaign.progress = {
            successCount,
            failCount,
            totalProcessed: successCount + failCount,
            totalRecipients: recipients.length,
          };
          await campaign.save();

          await new Promise((resolve) =>
            setTimeout(resolve, config.delayBetweenEmails)
          );
        }

        if (i + config.batchSize < recipients.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, config.delayBetweenBatches)
          );
        }
      }

      // Update final campaign status
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
      throw error;
    }
  }

  cancelScheduledCampaign(campaignId) {
    if (this.jobs.has(campaignId)) {
      this.jobs.get(campaignId).cancel();
      this.jobs.delete(campaignId);
      return true;
    }
    return false;
  }

  getScheduledJobs() {
    return Array.from(this.jobs.keys()).map((jobId) => {
      const job = this.jobs.get(jobId);
      return {
        campaignId: jobId,
        nextRun: job.nextInvocation()
          ? job
              .nextInvocation()
              .toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : null,
      };
    });
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;*/

// src/services/schedulerService.js
const schedule = require("node-schedule");
const Campaign = require("../../model/campaignModel");
const Email = require("../../model/emailModel");
const EmailTemplate = require("../../model/emailTemplateModel");
const emailService = require("../../mail/mailSender");
const logger = require("../../utils/logger");

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.initializeScheduledCampaigns();
  }

  async initializeScheduledCampaigns() {
    try {
      const scheduledCampaigns = await Campaign.find({
        status: "scheduled",
        scheduledDate: { $gt: new Date() },
      })
        .populate("senderEmail")
        .populate("templateId");

      for (const campaign of scheduledCampaigns) {
        await this.scheduleCampaign(campaign);
      }

      logger.info(`Initialized ${scheduledCampaigns.length} scheduled campaigns`);
    } catch (error) {
      logger.error("Error initializing scheduled campaigns", { error });
    }
  }

  async scheduleCampaign(campaign) {
    try {
      if (this.jobs.has(campaign._id.toString())) {
        this.jobs.get(campaign._id.toString()).cancel();
      }

      if (campaign.recipients && campaign.recipients.length > 0) {
        await Campaign.findByIdAndUpdate(campaign._id, {
          recipients: campaign.recipients,
        });
      }

      const rule = new schedule.RecurrenceRule();
      rule.tz = "Asia/Kolkata";
      const scheduledDate = new Date(campaign.scheduledDate);

      rule.year = scheduledDate.getFullYear();
      rule.month = scheduledDate.getMonth();
      rule.date = scheduledDate.getDate();
      rule.hour = scheduledDate.getHours();
      rule.minute = scheduledDate.getMinutes();
      rule.second = scheduledDate.getSeconds();

      logger.info("Scheduling campaign in IST", {
        campaignId: campaign._id,
        scheduledTime: scheduledDate.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
        year: rule.year,
        month: rule.month + 1,
        date: rule.date,
        hour: rule.hour,
        minute: rule.minute,
        second: rule.second,
      });

      const job = schedule.scheduleJob(rule, async () => {
        try {
          const freshCampaign = await Campaign.findById(campaign._id)
            .populate("templateId")
            .populate("senderEmail");

          if (!freshCampaign || freshCampaign.status !== "scheduled") {
            return;
          }

          if (!freshCampaign.senderEmail || !freshCampaign.templateId) {
            throw new Error("Missing required campaign components (sender email or template)");
          }

          freshCampaign.status = "sending";
          freshCampaign.progress = {
            successCount: 0,
            failCount: 0,
            totalProcessed: 0,
            totalRecipients: 0,
          };
          await freshCampaign.save();

          await this.processCampaign(freshCampaign);
          this.jobs.delete(campaign._id.toString());
        } catch (error) {
          logger.error(`Error executing scheduled campaign ${campaign._id}`, { error });
          await Campaign.findByIdAndUpdate(campaign._id, {
            status: "failed",
            errorMessage: error.message,
          });
        }
      });

      this.jobs.set(campaign._id.toString(), job);

      if (job.nextInvocation()) {
        logger.info("Next execution time (IST)", {
          campaignId: campaign._id,
          nextRun: job.nextInvocation().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
        });
      }

      return true;
    } catch (error) {
      logger.error("Error scheduling campaign", { error });
      throw error;
    }
  }

  async processCampaign(campaign) {
    const config = {
      batchSize: 10,
      delayBetweenEmails: 1000,
      delayBetweenBatches: 60000,
    };

    let successCount = 0;
    let failCount = 0;

    try {
      if (!campaign.recipients || !campaign.recipients.length) {
        throw new Error("No recipients found for campaign");
      }

      const recipients = campaign.recipients;
      campaign.progress.totalRecipients = recipients.length;
      await campaign.save();

      for (let i = 0; i < recipients.length; i += config.batchSize) {
        const batch = recipients.slice(i, Math.min(i + config.batchSize, recipients.length));

        for (const recipient of batch) {
          try {
            await emailService.sendEmail(
              campaign.senderEmail.email,
              recipient.email,
              campaign.subject,
              campaign.templateId.content,
              recipient,
              campaign.id,
              campaign.senderEmail.password
            );
            successCount++;
          } catch (error) {
            logger.error(`Error sending email to ${recipient.email}`, { error });
            failCount++;
          }

          campaign.progress = {
            successCount,
            failCount,
            totalProcessed: successCount + failCount,
            totalRecipients: recipients.length,
          };
          await campaign.save();

          await new Promise((resolve) =>
            setTimeout(resolve, config.delayBetweenEmails)
          );
        }

        if (i + config.batchSize < recipients.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, config.delayBetweenBatches)
          );
        }
      }

      campaign.status = "completed";
      campaign.completedAt = new Date();
      await campaign.save();

      logger.info(`Campaign ${campaign.id} completed`, {
        successCount,
        failCount,
      });
    } catch (error) {
      logger.error(`Error processing campaign ${campaign.id}`, { error });
      campaign.status = "failed";
      campaign.errorMessage = error.message;
      await campaign.save();
      throw error;
    }
  }

  cancelScheduledCampaign(campaignId) {
    if (this.jobs.has(campaignId)) {
      this.jobs.get(campaignId).cancel();
      this.jobs.delete(campaignId);
      logger.info(`Cancelled scheduled campaign ${campaignId}`);
      return true;
    }
    return false;
  }

  getScheduledJobs() {
    return Array.from(this.jobs.keys()).map((jobId) => {
      const job = this.jobs.get(jobId);
      return {
        campaignId: jobId,
        nextRun: job.nextInvocation()
          ? job.nextInvocation().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : null,
      };
    });
  }
}

const schedulerService = new SchedulerService();
module.exports = schedulerService;

