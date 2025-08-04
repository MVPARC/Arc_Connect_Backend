const express = require("express");
const router = express.Router();
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
const auth = require("../middleware/Auth");
const { checkStorageLimit } = require("../middleware/subscriptionMiddleware");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerName = "template-images";

// Convert bytes to MB
const bytesToMB = (bytes) => bytes / (1024 * 1024);

/**
 * @swagger
 * tags:
 *   name: FileUpload
 *   description: Upload images to Azure Blob and track storage usage
 */

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a single image file
 *     tags: [FileUpload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Server error during upload
 */
router.post(
  "/upload",
  auth(),
  upload.single("image"),
  checkStorageLimit,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const fileName = `${req.user._id}-${Date.now()}-${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);

      await blockBlobClient.upload(req.file.buffer, req.file.size, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });

      const fileSizeInMB = bytesToMB(req.file.size);
      await req.user.updateUsage("storage", "used", fileSizeInMB);

      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        imageUrl: blockBlobClient.url,
        size: fileSizeInMB,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading file",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /upload-multiple:
 *   post:
 *     summary: Upload multiple image files (max 5)
 *     tags: [FileUpload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *       400:
 *         description: No files uploaded
 *       500:
 *         description: Server error during upload
 */
router.post(
  "/upload-multiple",
  auth(),
  upload.array("images", 5),
  checkStorageLimit,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const uploadResults = [];
      let totalSizeInMB = 0;

      for (const file of req.files) {
        const fileName = `${req.user._id}-${Date.now()}-${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        await blockBlobClient.upload(file.buffer, file.size, {
          blobHTTPHeaders: { blobContentType: file.mimetype },
        });

        const fileSizeInMB = bytesToMB(file.size);
        totalSizeInMB += fileSizeInMB;

        uploadResults.push({
          originalName: file.originalname,
          imageUrl: blockBlobClient.url,
          size: fileSizeInMB,
        });
      }

      await req.user.updateUsage("storage", totalSizeInMB);

      const currentLimits = req.user.getCurrentLimits();
      const currentUsage = req.user.subscription.usage.storage.used;

      res.status(200).json({
        success: true,
        message: "Files uploaded successfully",
        files: uploadResults,
        storageStats: {
          used: currentUsage,
          limit: currentLimits.storage,
          remaining: currentLimits.storage - currentUsage,
        },
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading files",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /storage-stats:
 *   get:
 *     summary: Get current user's storage usage and limits
 *     tags: [FileUpload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns usage, limits, and percentage
 *       500:
 *         description: Failed to fetch usage
 */
router.get("/storage-stats", auth(), async (req, res) => {
  try {
    const currentLimits = req.user.getCurrentLimits();
    const currentUsage = req.user.subscription.usage.storage.used;

    res.status(200).json({
      success: true,
      storageStats: {
        used: currentUsage,
        limit: currentLimits.storage,
        remaining: currentLimits.storage - currentUsage,
        usagePercentage: (currentUsage / currentLimits.storage) * 100,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching storage stats",
      error: error.message,
    });
  }
});

module.exports = router;
