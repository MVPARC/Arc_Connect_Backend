// controllers/authController.js
const { User } = require("../model/userModel");
const OTP = require("../model/otpModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const passport = require("passport");

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Email Verification OTP",
    html: `
      <h1>Email Verification</h1>
      <p>Your OTP for email verification is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 5 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "24h", // Token expires in 24 hours
    }
  );
};

const generatePasswordResetToken = (email) => {
  const resetCode = crypto.randomBytes(32).toString("hex");
  return {
    token: jwt.sign(
      {
        email,
        resetCode,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    ),
    resetCode, // We'll store this in the database
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
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password } = req.body;

      // Check if username or email already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (existingUser) {
        return res.status(400).json({
          error:
            existingUser.username === username
              ? "Username already taken"
              : "Email already registered",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword,
        role: "user", // Explicitly set default role
      });
      await user.save();

      // Generate and save OTP
      const otp = generateOTP();
      const otpDoc = new OTP({
        email,
        otp,
      });
      await otpDoc.save();

      // Send OTP email
      await sendOTPEmail(email, otp);

      res.status(201).json({
        message: "Please verify your email to complete registration",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  },

  // Login user with username
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Find user by username
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res
          .status(401)
          .json({ error: "Please verify your email first" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  },

  // Verify OTP
  verifyOTP: async (req, res) => {
    try {
      const { email, otp } = req.body;

      const otpDoc = await OTP.findOne({
        email,
        otp,
      });

      if (!otpDoc) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Verify user
      await User.updateOne({ email }, { isVerified: true });
      await OTP.deleteOne({ _id: otpDoc._id });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  },

  // Resend OTP
  resendOTP: async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      // Delete any existing OTP
      await OTP.deleteOne({ email });

      // Generate and save new OTP
      const otp = generateOTP();
      const otpDoc = new OTP({
        email,
        otp,
      });
      await otpDoc.save();

      // Send new OTP email
      await sendOTPEmail(email, otp);

      res.json({ message: "New OTP sent successfully" });
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ error: "Failed to resend OTP" });
    }
  },

  // Get user profile

  // Get user profile with subscription details
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
                  remaining:
                    currentLimits.campaigns.total - usage.campaigns.totalUsed,
                },
                active: {
                  used: usage.campaigns.activeCount,
                  limit: currentLimits.campaigns.active,
                  remaining:
                    currentLimits.campaigns.active -
                    usage.campaigns.activeCount,
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
                  (usage.storage.used / currentLimits.storage) *
                  100
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
      console.error("Profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  },

  // getProfile: async (req, res) => {
  //   try {
  //     res.json({
  //       user: {
  //         id: req.user._id,
  //         name: req.user.name,
  //         username: req.user.username,
  //         email: req.user.email,
  //         role: req.user.role,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Profile error:", error);
  //     res.status(500).json({ error: "Failed to get profile" });
  //   }
  // },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate reset token with email in payload
      const { token, resetCode } = generatePasswordResetToken(email);

      // Save reset code to user
      user.resetPasswordToken = resetCode; // Store the code, not the full JWT
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Send password reset email
      await sendPasswordResetEmail(email, token);

      res.json({ message: "Password reset instructions sent to your email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res
        .status(500)
        .json({ error: "Failed to process forgot password request" });
    }
  },

  // And update the resetPassword controller to verify the JWT:
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      // Verify and decode the JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { email, resetCode } = decoded;

      // Find user with valid reset token
      const user = await User.findOne({
        email,
        resetPasswordToken: resetCode,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user's password and clear reset token fields
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: "Password reset successful" });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  },
  // Add to authController.js
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  googleAuth: passport.authenticate("google", {
    scope: ["profile", "email"],
  }),

  googleCallback: (req, res, next) => {
    passport.authenticate("google", async (err, user) => {
      if (err) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=GoogleAuthFailed`
        );
      }

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=NoUserFound`
        );
      }

      try {
        // Generate JWT token
        const token = generateToken(user);

        // Redirect to frontend with token
        res.redirect(
          `${process.env.FRONTEND_URL}/google-auth-success?token=${token}`
        );
      } catch (error) {
        console.error("Google auth callback error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=AuthError`);
      }
    })(req, res, next);
  },
};

module.exports = authController;
