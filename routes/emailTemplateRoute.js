const express = require("express");
const router = express.Router();
const emailTemplateController = require("../controller/emailTemplateController");
const auth = require("../middleware/Auth");
const { checkTemplateLimit } = require("../middleware/subscriptionMiddleware");

// Apply auth middleware to all routes
router.use(auth());

// Add checkTemplateLimit to template creation
router.post(
  "/",
  auth,
  checkTemplateLimit,
  emailTemplateController.createTemplate
);

// Other routes remain unchanged
router.get("/", emailTemplateController.getAllTemplates);
router.get(
  "/:id",
  emailTemplateController.getTemplateMiddleware,
  emailTemplateController.getTemplate
);
router.put(
  "/:id",
  emailTemplateController.getTemplateMiddleware,
  emailTemplateController.updateTemplate
);
router.delete(
  "/:id",
  emailTemplateController.getTemplateMiddleware,
  emailTemplateController.deleteTemplate
);

module.exports = router;
