const express = require("express");
const router = express.Router();
const emailTemplateController = require("../controller/emailTemplateController");
const auth = require("../middleware/Auth");

// Apply auth middleware to all routes
router.use(auth);

router.get("/", emailTemplateController.getAllTemplates);
router.post("/", emailTemplateController.createTemplate);
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
