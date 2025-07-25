// controllers/authController.js
const { User } = require("../model/userModel");
const OTP = require("../model/otpModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const passport = require("passport");
const crypto = require("crypto");
const winston = require("winston");
const Organization = require("../model/organizationModel");

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new (require("winston-loki"))({
      host: "http://localhost:3100",
      labels: { app: "arc_connect_backend" },
    }),
  ],
});

// ========== Shared Prometheus Metrics ==========
const { client, register } = require("../utils/PrometheusRegistry");

const loginFailuresCounter = new client.Counter({
  name: "login_failures_total",
  help: "Total number of failed login attempts",
});
const emailSentCounter = new client.Counter({
  name: "emails_sent_total",
  help: "Total number of emails sent by system",
});

register.registerMetric(loginFailuresCounter);
register.registerMetric(emailSentCounter);

// ========== Nodemailer Setup ==========
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ========== OTP Utilities ==========
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Email Verification OTP",
    html: `
      <h1>Email Verification</h1>
      <p>Your OTP is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 5 minutes.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
  emailSentCounter.inc();
  logger.info(`OTP sent to ${email}`);
};

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      organization: user.organization || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

const generatePasswordResetToken = (email) => {
  const resetCode = crypto.randomBytes(32).toString("hex");
  return {
    token: jwt.sign({ email, resetCode }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    }),
    resetCode,
  };
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Password Reset Request",
    html: `
      <h1>Password Reset Request</h1>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
  emailSentCounter.inc();
  logger.info(`Password reset email sent to ${email}`);
};

// ========== Auth Controller ==========
const authController = {
 register: async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      organizationName,
      organizationDomain,
      organizationAddress,
    } = req.body;

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const conflicts = [];
      if (existingUser.email === email) conflicts.push("email");
      if (existingUser.username === username) conflicts.push("username");

      return res.status(400).json({
        error: `${conflicts.join(" and ")} already registered`,
      });
    }

    // Check or create organization
    let org = await Organization.findOne({
      $or: [{ name: organizationName }, { domain: organizationDomain }],
    });

    if (!org) {
      org = new Organization({
        name: organizationName,
        domain: organizationDomain,
        address: organizationAddress,
      });
      await org.save();
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      organization: org._id,
      isVerified: false,
    });
    await newUser.save();

    // Set createdBy if first user
    if (!org.createdBy) {
      org.createdBy = newUser._id;
      await org.save();
    }

    // Generate and send OTP
    const otp = generateOTP();
    await new OTP({ email, otp }).save();
    await sendOTPEmail(email, otp);

    logger.info(`User registered: ${username}, email: ${email}`);
    res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        organization: org.name,
      },
    });
  } catch (err) {
    logger.error("Register error", { error: err });
    res.status(500).json({ error: "Server error during registration" });
  }
},

  // (rest of the unchanged methods below...)

  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { username, password } = req.body;
      const user = await User.findOne({ username }).populate("organization");
      if (!user) {
        loginFailuresCounter.inc();
        logger.warn(`Login failed: user not found - ${username}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isVerified) {
        logger.warn(`Login blocked: email not verified - ${username}`);
        return res.status(401).json({ error: "Please verify your email first" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        loginFailuresCounter.inc();
        logger.warn(`Login failed: wrong password - ${username}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user);
      logger.info(`User logged in: ${username}`);
      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization: user.organization ? user.organization.name : null,
        },
      });
    } catch (error) {
      logger.error("Login error", { error });
      res.status(500).json({ error: "Login failed" });
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const { email, otp } = req.body;
      const otpDoc = await OTP.findOne({ email, otp });
      if (!otpDoc) {
        logger.warn(`OTP verification failed for ${email}`);
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      await User.updateOne({ email }, { isVerified: true });
      await OTP.deleteOne({ _id: otpDoc._id });

      logger.info(`Email verified: ${email}`);
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      logger.error("OTP verification error", { error });
      res.status(500).json({ error: "Verification failed" });
    }
  },

  resendOTP: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.isVerified)
        return res.status(400).json({ error: "Email already verified" });

      await OTP.deleteOne({ email });
      const otp = generateOTP();
      await new OTP({ email, otp }).save();
      await sendOTPEmail(email, otp);

      logger.info(`OTP resent to ${email}`);
      res.json({ message: "New OTP sent successfully" });
    } catch (error) {
      logger.error("Resend OTP error", { error });
      res.status(500).json({ error: "Failed to resend OTP" });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      const { token, resetCode } = generatePasswordResetToken(email);
      user.resetPasswordToken = resetCode;
      user.resetPasswordExpires = Date.now() + 3600000;
      await user.save();

      await sendPasswordResetEmail(email, token);
      logger.info(`Password reset requested for ${email}`);
      res.json({ message: "Password reset instructions sent" });
    } catch (error) {
      logger.error("Forgot password error", { error });
      res.status(500).json({ error: "Failed to process forgot password request" });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { email, resetCode } = decoded;

      const user = await User.findOne({
        email,
        resetPasswordToken: resetCode,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user)
        return res.status(400).json({ error: "Invalid or expired reset token" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      logger.info(`Password reset successful for ${email}`);
      res.json({ message: "Password reset successful" });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      logger.error("Reset password error", { error });
      res.status(500).json({ error: "Failed to reset password" });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json({ users });
    } catch (error) {
      logger.error("Get all users error", { error });
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  googleAuth: passport.authenticate("google", { scope: ["profile", "email"] }),

  googleCallback: (req, res, next) => {
    passport.authenticate("google", async (err, user) => {
      if (err || !user) {
        logger.warn("Google auth failed", { err });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=GoogleAuthFailed`);
      }

      try {
        const token = generateToken(user);
        logger.info(`Google login success: ${user.email}`);
        res.redirect(`${process.env.FRONTEND_URL}/google-auth-success?token=${token}`);
      } catch (error) {
        logger.error("Google auth callback error", { error });
        res.redirect(`${process.env.FRONTEND_URL}/login?error=AuthError`);
      }
    })(req, res, next);
  },

  getProfile: async (req, res) => {
    try {
      const user = req.user;
      const currentLimits = user.getCurrentLimits();
      const usage = user.subscription.usage;

      res.json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          subscription: {
            plan: user.subscription.plan,
            status: user.subscription.status,
            startDate: user.subscription.startDate,
            endDate: user.subscription.endDate,
            usage: {
              campaigns: {
                total: {
                  used: usage.campaigns.totalUsed,
                  limit: currentLimits.campaigns.total,
                  remaining: currentLimits.campaigns.total - usage.campaigns.totalUsed,
                },
                active: {
                  used: usage.campaigns.activeCount,
                  limit: currentLimits.campaigns.active,
                  remaining: currentLimits.campaigns.active - usage.campaigns.activeCount,
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
                usagePercentage: (
                  (usage.storage.used / currentLimits.storage) * 100
                ).toFixed(2),
              },
              contacts: {
                used: usage.contacts.count,
                limit: currentLimits.contacts,
                remaining: currentLimits.contacts - usage.contacts.count,
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error("Get profile error", { error });
      res.status(500).json({ error: "Failed to get profile" });
    }
  },
};

module.exports = authController;
