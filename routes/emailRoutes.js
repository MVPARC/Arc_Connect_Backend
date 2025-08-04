const express = require("express");
const router = express.Router();
const Email = require("../model/emailModel");
const auth = require("../middleware/Auth");

// ✅ Apply authentication middleware
router.use(auth());

/**
 * @swagger
 * tags:
 *   name: Emails
 *   description: Manage sender email accounts
 */

/**
 * @swagger
 * /emails/add:
 *   post:
 *     summary: Add a new email account
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Email added successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post("/add", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }

    const existingEmail = await Email.findOne({ email, user: req.user._id });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "This email is already registered." });
    }

    const newEmail = new Email({ name, email, password, user: req.user._id });
    await newEmail.save();

    const { password: _, ...emailResponse } = newEmail.toObject();

    return res.status(201).json({
      success: true,
      message: "Email added successfully!",
      data: emailResponse,
    });
  } catch (error) {
    console.error("Error adding email:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /emails:
 *   get:
 *     summary: Get all emails for the authenticated user
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of emails
 */
router.get("/", async (req, res) => {
  try {
    const emails = await Email.find({ user: req.user._id }).select("name email");
    return res.status(200).json({ success: true, data: emails });
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /emails/update/{id}:
 *   put:
 *     summary: Update a specific email
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Email ID to update
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email updated successfully
 *       404:
 *         description: Email not found or unauthorized
 */
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and Email are required." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    const updatedEmail = await Email.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { name, email, ...(password && { password }) },
      { new: true }
    ).select("-password");

    if (!updatedEmail) {
      return res.status(404).json({
        success: false,
        message: "Email not found or you don't have permission to update it.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email updated successfully!",
      data: updatedEmail,
    });
  } catch (error) {
    console.error("Error updating email:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /emails/delete/{id}:
 *   delete:
 *     summary: Delete a specific email
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Email ID to delete
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email deleted successfully
 *       404:
 *         description: Email not found or unauthorized
 */
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEmail = await Email.findOneAndDelete({ _id: id, user: req.user._id });
    if (!deletedEmail) {
      return res.status(404).json({
        success: false,
        message: "Email not found or you don't have permission to delete it.",
      });
    }

    return res.status(200).json({ success: true, message: "Email deleted successfully!" });
  } catch (error) {
    console.error("Error deleting email:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
