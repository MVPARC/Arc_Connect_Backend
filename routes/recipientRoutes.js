const express = require("express");
const router = express.Router();
const recipientController = require("../controller/recepientController");
const auth = require("../middleware/Auth");
const { checkContactLimit } = require("../middleware/subscriptionMiddleware");
const mongoose = require("mongoose");

// Apply auth middleware globally
router.use(auth());

// ✅ Search route FIRST (static routes before dynamic ones)
router.get("/search", recipientController.searchRecipients);

// Add contact limit check to routes that add contacts
router.post("/", checkContactLimit, recipientController.createList);
router.post("/upload", checkContactLimit, recipientController.uploadRecipients);
router.post("/:id/recipients", checkContactLimit, recipientController.addRecipientsToList);

// ✅ Validate ObjectId middleware
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  next();
};

// Other routes
router.get("/", recipientController.getAllLists);
router.get("/:id", validateObjectId, recipientController.getListById);
router.put("/:id", validateObjectId, recipientController.updateList);
router.delete("/:id", validateObjectId, recipientController.deleteList);
router.delete("/:id/recipients", validateObjectId, recipientController.removeRecipientsFromList);

module.exports = router;
