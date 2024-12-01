// controllers/authController.js
const User = require("../model/userModel");
const OTP = require("../model/otpModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
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
  getProfile: async (req, res) => {
    try {
      res.json({
        user: {
          id: req.user._id,
          name: req.user.name,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        },
      });
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
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
};

module.exports = authController;
