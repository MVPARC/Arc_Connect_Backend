/*require("dotenv").config();
const nodemailer = require("nodemailer");

const EMAIL_HOST = process.env.MAIL_HOST;
const EMAIL_PORT = 587;
const EMAIL_USER = process.env.MAIL_USER;
const EMAIL_PASS = process.env.MAIL_PASS;
const BACKEND_URL = process.env.BACKEND_URL || "https://arconnect.mvparc.com";

// Helper function to process template links
const processTemplateLinks = (htmlContent, campaignId, recipientId) => {
  let processedHtml = htmlContent;
  let linkId = 0;

  // Replace trackingUrl tokens if they exist
  processedHtml = processedHtml.replace(
    /\{\{trackingUrl:(.*?)\}\}/g,
    (match, url) => {
      linkId++;
      return `${BACKEND_URL}/api/tracking/click/${campaignId}/${recipientId}/link-${linkId}?url=${encodeURIComponent(
        url
      )}`;
    }
  );

  // Also look for regular <a href> tags and add tracking (optional)
  // This is more advanced and could be enabled with a config option
  // processedHtml = processedHtml.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/gi, (match, url) => {
  //   // Skip if it's already a tracking URL or mailto link
  //   if (url.includes('/api/tracking/click/') || url.startsWith('mailto:')) {
  //     return match;
  //   }
  //   linkId++;
  //   return `<a href="${BACKEND_URL}/api/tracking/click/${campaignId}/${recipientId}/link-${linkId}?url=${encodeURIComponent(url)}"`;
  // });

  return processedHtml;
};

exports.sendEmail = async (
  senderEmail,
  to,
  subject,
  htmlContent,
  recipientData,
  campaignId,
  senderPassword
) => {
  const { name, id: recipientId } = recipientData;

  console.log("receipietn,=", recipientId);
  console.log("campaign,=", campaignId);

  // Personalize content with name
  let personalizedContent = htmlContent.replace(/\${NAME}/g, name);

  // Process tracking links
  personalizedContent = processTemplateLinks(
    personalizedContent,
    campaignId,
    recipientId
  );

  // Add tracking pixel
  const trackingPixel = `<img src="${BACKEND_URL}/api/tracking/${campaignId}/${recipientId}" width="1" height="1" />`;
  personalizedContent += trackingPixel;

  const mailOptions = {
    from: senderEmail,
    to,
    subject,
    html: personalizedContent,
  };

  // Create a transporter with dynamic credentials
  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: 587,
    secure: false,
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};*/
require("dotenv").config();
const nodemailer = require("nodemailer");
const logger = require("../utils/logger"); // <== use your Winston-Loki logger

const EMAIL_HOST = process.env.MAIL_HOST;
const EMAIL_PORT = 587;
const BACKEND_URL = process.env.BACKEND_URL || "https://arconnect.mvparc.com";

// Helper function to wrap links with tracking URLs
const processTemplateLinks = (htmlContent, campaignId, recipientId) => {
  let processedHtml = htmlContent;
  let linkId = 0;

  processedHtml = processedHtml.replace(
    /\{\{trackingUrl:(.*?)\}\}/g,
    (match, url) => {
      linkId++;
      return `${BACKEND_URL}/api/tracking/click/${campaignId}/${recipientId}/link-${linkId}?url=${encodeURIComponent(url)}`;
    }
  );

  return processedHtml;
};

// Main export function
exports.sendEmail = async (
  senderEmail,
  to,
  subject,
  htmlContent,
  recipientData,
  campaignId,
  senderPassword
) => {
  const { name, id: recipientId } = recipientData;

  logger.info("Preparing email", {
    to,
    campaignId,
    recipientId,
    sender: senderEmail,
  });

  let personalizedContent = htmlContent.replace(/\${NAME}/g, name);
  personalizedContent = processTemplateLinks(personalizedContent, campaignId, recipientId);

  const trackingPixel = `<img src="${BACKEND_URL}/api/tracking/${campaignId}/${recipientId}" width="1" height="1" />`;
  personalizedContent += trackingPixel;

  const mailOptions = {
    from: senderEmail,
    to,
    subject,
    html: personalizedContent,
  };

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: false,
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent successfully", {
      messageId: info.messageId,
      to,
      campaignId,
      recipientId,
    });
    return info;
  } catch (error) {
    logger.error("Email sending failed", {
      to,
      campaignId,
      recipientId,
      error: error.message,
    });
    throw error;
  }
};

