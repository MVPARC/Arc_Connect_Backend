/*const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendVerifyEmail(data) {
  const { email, otp } = data;
  try {
    const message = {
      from: "info@renderease.com",
      to: email,
      subject: "Verify your email",
      text: `Please verify your email address by using OTP: ${otp}`,
    };

    await transporter.sendMail(message);
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Error sending verification email to ${email}:`, error);
    return false;
  }
}

module.exports = {
  sendVerifyEmail,
};
*/
const nodemailer = require("nodemailer");
const logger = require("../utils/logger"); // optional, fallback to console if not using

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendVerifyEmail(data) {
  const { email, otp } = data;
  try {
    const message = {
      from: process.env.MAIL_USER || "info@renderease.com", // fallback
      to: email,
      subject: "Verify your email",
      text: `Please verify your email address using this OTP: ${otp}`,
      html: `<h2>Email Verification</h2><p>Your OTP is: <strong>${otp}</strong></p>`,
    };

    await transporter.sendMail(message);
    logger.info(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending verification email to ${email}: ${error.message}`);
    return false;
  }
}

module.exports = {
  sendVerifyEmail,
};
