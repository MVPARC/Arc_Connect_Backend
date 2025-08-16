const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const auth = require("../middleware/Auth");
const { body } = require("express-validator");
const checkRole = require("../middleware/checkRole");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Registration successful
 */
router.post("/register", [
  body("username")
    .trim()
    .notEmpty()
    .isLength({ min: 4 })
    .matches(/^[a-zA-Z0-9_]+$/),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
], authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", [
  body("username").trim().notEmpty(),
  body("password").notEmpty(),
], authController.login);

/**
 * @swagger
 * /auth/request-email-verification:
 *   post:
 *     summary: Request email verification OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email verification OTP sent
 *       400:
 *         description: Invalid email
 */
router.post("/request-email-verification", [
  body("email").isEmail().normalizeEmail(),
], authController.requestEmailVerification);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP for user registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified
 */
router.post("/verify-email-otp", authController.verifyEmailOTP);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Resend OTP to the user's email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent
 */
router.post("/resend-otp", authController.resendOTP);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", auth, checkRole(["user", "admin"]), authController.getProfile);

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 */
router.get("/users", auth(), checkRole(["admin"]), authController.getAllUsers);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post("/forgot-password", [
  body("email").isEmail(),
], authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with new password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post("/reset-password", [
  body("newPassword").isLength({ min: 6 }),
], authController.resetPassword);

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Start Google OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get("/google", authController.googleAuth);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Google OAuth success
 */
router.get("/google/callback", authController.googleCallback);

module.exports = router;
