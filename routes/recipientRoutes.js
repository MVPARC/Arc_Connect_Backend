// routes/recipientRoutes.js
const express = require("express");
const router = express.Router();
const recipientController = require("../controller/recepientController");
const auth = require("../middleware/Auth");

// Apply auth middleware to all routes
router.use(auth);

// Create new recipient list
router.post("/", recipientController.createList);

// Get all recipient lists (without recipient details)
router.get("/", recipientController.getAllLists);

// Get specific recipient list with all details
router.get("/:id", recipientController.getListById);

// Update recipient list
router.put("/:id", recipientController.updateList);

// Delete recipient list
router.delete("/:id", recipientController.deleteList);

// Add recipients to existing list
router.post("/:id/recipients", recipientController.addRecipientsToList);

// Remove recipients from list
router.delete("/:id/recipients", recipientController.removeRecipientsFromList);

// Search recipients
router.get("/search", recipientController.searchRecipients);

// Upload recipients (CSV or bulk)
router.post("/upload", recipientController.uploadRecipients);

module.exports = router;
