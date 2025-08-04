const express = require("express");
const router = express.Router();
const recipientController = require("../controller/recepientController");
const auth = require("../middleware/Auth");
const { checkContactLimit } = require("../middleware/subscriptionMiddleware");
const mongoose = require("mongoose");

// Apply auth middleware globally
router.use(auth());

/**
 * @swagger
 * tags:
 *   name: RecipientLists
 *   description: Manage recipient lists and contacts
 */

/**
 * @swagger
 * /recipients/search:
 *   get:
 *     summary: Search recipients across all lists
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search term (name or email)
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", recipientController.searchRecipients);

/**
 * @swagger
 * /recipients:
 *   post:
 *     summary: Create a new recipient list
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: List created
 */
router.post("/", checkContactLimit, recipientController.createList);

/**
 * @swagger
 * /recipients/upload:
 *   post:
 *     summary: Upload multiple recipients to a list via file
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Recipients uploaded
 */
router.post("/upload", checkContactLimit, recipientController.uploadRecipients);

/**
 * @swagger
 * /recipients/{id}/recipients:
 *   post:
 *     summary: Add recipients to an existing list
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *     responses:
 *       200:
 *         description: Recipients added
 */
router.post("/:id/recipients", checkContactLimit, recipientController.addRecipientsToList);

// ✅ Validate ObjectId middleware
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  next();
};

/**
 * @swagger
 * /recipients:
 *   get:
 *     summary: Get all recipient lists
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all recipient groups
 */
router.get("/", recipientController.getAllLists);

/**
 * @swagger
 * /recipients/{id}:
 *   get:
 *     summary: Get a recipient list by ID
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: List ID
 *     responses:
 *       200:
 *         description: List details
 */
router.get("/:id", validateObjectId, recipientController.getListById);

/**
 * @swagger
 * /recipients/{id}:
 *   put:
 *     summary: Update a recipient list
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: List updated
 */
router.put("/:id", validateObjectId, recipientController.updateList);

/**
 * @swagger
 * /recipients/{id}:
 *   delete:
 *     summary: Delete a recipient list
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: List deleted
 */
router.delete("/:id", validateObjectId, recipientController.deleteList);

/**
 * @swagger
 * /recipients/{id}/recipients:
 *   delete:
 *     summary: Remove recipients from a list
 *     tags: [RecipientLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Recipients removed
 */
router.delete("/:id/recipients", validateObjectId, recipientController.removeRecipientsFromList);

module.exports = router;
