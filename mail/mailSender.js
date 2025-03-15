// require("dotenv").config();

// // src/services/email.service.js
// const nodemailer = require("nodemailer");

// const EMAIL_HOST = process.env.MAIL_HOST;
// const EMAIL_PORT = 587;
// const EMAIL_USER = process.env.MAIL_USER;
// const EMAIL_PASS = process.env.MAIL_PASS;

// exports.sendEmail = async (
//   senderEmail,
//   to,
//   subject,
//   htmlContent,
//   recipientData,
//   campaignId,
//   senderPassword // Accept password
// ) => {
//   const { name, id: recipientId } = recipientData;

//   let personalizedContent = htmlContent.replace(/\${NAME}/g, name);

//   const trackingPixel = `<img src="https://arconnect.mvparc.com/api/tracking/${campaignId}/${recipientId}" width="1" height="1" />`;
//   personalizedContent += trackingPixel;

//   const mailOptions = {
//     from: senderEmail,
//     to,
//     subject,
//     html: personalizedContent,
//   };

//   // Create a transporter with dynamic credentials
//   const transporter = nodemailer.createTransport({
//     host: EMAIL_HOST,
//     port: 587,
//     secure: false,
//     auth: {
//       user: senderEmail,
//       pass: senderPassword,
//     },
//   });

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log("Message sent: %s", info.messageId);
//     return info;
//   } catch (error) {
//     console.error("Error sending email:", error);
//     throw error;
//   }
// };

require("dotenv").config();

// src/services/email.service.js
const nodemailer = require("nodemailer");

const EMAIL_HOST = process.env.MAIL_HOST;
const EMAIL_PORT = 587;
const EMAIL_USER = process.env.MAIL_USER;
const EMAIL_PASS = process.env.MAIL_PASS;
const BACKEND_URL = process.env.BACKEND_URL || "https://arconnect.mvparc.com"; // Get from .env with fallback

exports.sendEmail = async (
  senderEmail,
  to,
  subject,
  htmlContent,
  recipientData,
  campaignId,
  senderPassword // Accept password
) => {
  const { name, id: recipientId } = recipientData;

  let personalizedContent = htmlContent.replace(/\${NAME}/g, name);

  // Use BACKEND_URL from .env
  console.log("backed url", BACKEND_URL);
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
};
