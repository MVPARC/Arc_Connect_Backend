// routes/emailRoutes.js
const express = require("express");
const router = express.Router();
const Email = require("../model/emailModel");
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
    // Create a new email record
    const newEmail = new Email({ name, email, password });
    await newEmail.save();
    res
      .status(201)
      .json({ message: "Email added successfully!", email: newEmail });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding email." });
  }
});

// to get all emails along with names
router.get("/", async (req, res) => {
  try {
    const emails = await Email.find({}, "name email");
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
    // Find the email by ID and update it
    const updatedEmail = await Email.findByIdAndUpdate(
      id,
      { name, email, password },
      { new: true }
    );

    if (!updatedEmail) {
      return res.status(404).json({ message: "Email not found." });
    }

    res
      .status(200)
      .json({ message: "Email updated successfully!", email: updatedEmail });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating email." });
  }
});

// to delete an email
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params; // Get the email ID from the URL

  try {
    // Find the email by ID and delete
    const deletedEmail = await Email.findByIdAndDelete(id);

    if (!deletedEmail) {
      return res.status(404).json({ message: "Email not found." });
    }

    res.status(200).json({ message: "Email deleted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting email." });
  }
});

module.exports = router;
