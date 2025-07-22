const express = require("express");
const router = express.Router();
const Email = require("../model/emailModel");
const auth = require("../middleware/Auth");

// ✅ Apply authentication middleware
router.use(auth());

/**
 * ✅ Add a new email
 */
router.post("/add", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }

    // Check if email already exists for this user
    const existingEmail = await Email.findOne({ email, user: req.user._id });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "This email is already registered." });
    }

    // Create and save
    const newEmail = new Email({ name, email, password, user: req.user._id });
    await newEmail.save();

    // Remove password from response
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
 * ✅ Get all emails for the logged-in user
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
 * ✅ Update email details
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
 * ✅ Delete an email
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
