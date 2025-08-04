const express = require("express");
const router = express.Router();
const emailTemplateController = require("../controller/emailTemplateController");
const auth = require("../middleware/Auth");
const { checkTemplateLimit } = require("../middleware/subscriptionMiddleware");

// Apply auth middleware to all routes
router.use(auth());

/**
 * @swagger
 * tags:
 *   name: EmailTemplates
 *   description: Manage email templates
 */

/**
 * @swagger
 * /templates:
 *   post:
 *     summary: Create a new email template
 *     tags: [EmailTemplates]
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
 *               - subject
 *               - content
 *             properties:
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template created successfully
 *       403:
 *         description: Subscription limit reached
 */
router.post("/", checkTemplateLimit, emailTemplateController.createTemplate);

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: Get all email templates for the user
 *     tags: [EmailTemplates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of email templates
 */
router.get("/", emailTemplateController.getAllTemplates);

/**
 * @swagger
 * /templates/{id}:
 *   get:
 *     summary: Get a single email template by ID
 *     tags: [EmailTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Template ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template data
 *       404:
 *         description: Template not found
 */
router.get(
  "/:id",
  emailTemplateController.getTemplateMiddleware,
  emailTemplateController.getTemplate
);

/**
 * @swagger
 * /templates/{id}:
 *   put:
 *     summary: Update a specific email template
 *     tags: [EmailTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Template ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 */
router.put(
  "/:id",
  emailTemplateController.getTemplateMiddleware,
  emailTemplateController.updateTemplate
);

/**
 * @swagger
 * /templates/{id}:
 *   delete:
 *     summary: Delete a specific email template
 *     tags: [EmailTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Template ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 */
router.delete(
  "/:id",
  emailTemplateController.getTemplateMiddleware,
  emailTemplateController.deleteTemplate
);

module.exports = router;
