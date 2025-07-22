const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const auth = require("../middleware/Auth");
const { body } = require("express-validator");
const checkRole = require("../middleware/checkRole");

// ====================
// Validation Middleware
// ====================
const registerValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 4 })
    .withMessage("Username must be at least 4 characters long")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers and underscores"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const loginValidation = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const resetPasswordValidation = [
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// ====================
// Auth Routes
// ====================
router.post("/register", registerValidation, authController.register);
router.post("/login", loginValidation, authController.login);
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authController.resendOTP);

// Profile & User Management
router.get(
  "/profile",
  auth,
  checkRole(["user", "admin"]),
  authController.getProfile
);
router.get("/users", auth(), checkRole(["admin"]), authController.getAllUsers);

// Password Management
router.post(
  "/forgot-password",
  body("email").isEmail().withMessage("Valid email is required"),
  authController.forgotPassword
);
router.post("/reset-password", resetPasswordValidation, authController.resetPassword);

// Google OAuth Routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

module.exports = router;
