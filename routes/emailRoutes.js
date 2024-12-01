// routes/emailRoutes.js
const express = require("express");
const router = express.Router();
const Email = require("../model/emailModel");
const auth = require("../middleware/Auth");

// Apply auth middleware to all routes
router.use(auth);

// Route to add a new email with name and password
router.post("/add", async (req, res) => {
  const { name, email, password } = req.body;

  // Validate the inputs
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  try {
    // Check if email already exists for this user
    const existingEmail = await Email.findOne({
      email,
      user: req.user._id,
    });

    if (existingEmail) {
      return res.status(400).json({
        message: "This email is already registered.",
      });
    }

    // Create a new email record with user reference
    const newEmail = new Email({
      name,
      email,
      password,
      user: req.user._id, // Add user reference
    });

    await newEmail.save();

    // Remove password from response
    const emailResponse = newEmail.toObject();
    delete emailResponse.password;

    res.status(201).json({
      message: "Email added successfully!",
      email: emailResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding email." });
  }
});

// to get all emails along with names
router.get("/", async (req, res) => {
  try {
    // Only get emails for the authenticated user
    const emails = await Email.find({ user: req.user._id }, "name email");
    res.status(200).json(emails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving emails." });
  }
});

// to update an email
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    // Find the email by ID and user, then update it
    const updatedEmail = await Email.findOneAndUpdate(
      { _id: id, user: req.user._id }, // Check user ownership
      { name, email, password },
      { new: true }
    ).select("-password"); // Exclude password from response

    if (!updatedEmail) {
      return res.status(404).json({
        message: "Email not found or you don't have permission to update it.",
      });
    }

    res.status(200).json({
      message: "Email updated successfully!",
      email: updatedEmail,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating email." });
  }
});

// to delete an email
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Find the email by ID and user, then delete
    const deletedEmail = await Email.findOneAndDelete({
      _id: id,
      user: req.user._id, // Check user ownership
    });

    if (!deletedEmail) {
      return res.status(404).json({
        message: "Email not found or you don't have permission to delete it.",
      });
    }

    res.status(200).json({ message: "Email deleted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting email." });
  }
});

module.exports = router;
