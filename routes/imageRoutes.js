// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const { BlobServiceClient } = require("@azure/storage-blob");
// // const { auth } = require("../middleware/auth"); // Assuming you have auth middleware

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
// });

// const blobServiceClient = BlobServiceClient.fromConnectionString(
//   process.env.AZURE_STORAGE_CONNECTION_STRING
// );
// const containerName = "template-images";

// router.post("/upload", upload.single("image"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const containerClient = blobServiceClient.getContainerClient(containerName);

//     // Generate unique filename
//     const fileName = `${Date.now()}-${req.file.originalname}`;
//     const blockBlobClient = containerClient.getBlockBlobClient(fileName);

//     // Upload file
//     await blockBlobClient.upload(req.file.buffer, req.file.size, {
//       blobHTTPHeaders: { blobContentType: req.file.mimetype },
//     });

//     // Get the URL of the uploaded blob
//     const imageUrl = blockBlobClient.url;

//     res.status(200).json({
//       message: "File uploaded successfully",
//       imageUrl: imageUrl,
//     });
//   } catch (error) {
//     console.error("Error uploading file:", error);
//     res.status(500).json({
//       message: "Error uploading file",
//       error: error.message,
//     });
//   }
// });

// // Upload multiple images
// router.post(
//   "/upload-multiple",
//   // auth,
//   upload.array("images", 5),
//   async (req, res) => {
//     try {
//       if (!req.files || req.files.length === 0) {
//         return res.status(400).json({ message: "No files uploaded" });
//       }

//       const containerClient =
//         blobServiceClient.getContainerClient(containerName);
//       const uploadResults = [];

//       // Upload each file
//       for (const file of req.files) {
//         const fileName = `${Date.now()}-${file.originalname}`;
//         const blockBlobClient = containerClient.getBlockBlobClient(fileName);

//         await blockBlobClient.upload(file.buffer, file.size, {
//           blobHTTPHeaders: { blobContentType: file.mimetype },
//         });

//         uploadResults.push({
//           originalName: file.originalname,
//           imageUrl: blockBlobClient.url,
//         });
//       }

//       res.status(200).json({
//         message: "Files uploaded successfully",
//         files: uploadResults,
//       });
//     } catch (error) {
//       console.error("Error uploading files:", error);
//       res.status(500).json({
//         message: "Error uploading files",
//         error: error.message,
//       });
//     }
//   }
// );

// module.exports = router;

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
const auth = require("../middleware/Auth");
const { checkStorageLimit } = require("../middleware/subscriptionMiddleware");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerName = "template-images";

// Helper function to convert bytes to MB
const bytesToMB = (bytes) => bytes / (1024 * 1024);

// Single file upload with limit checking
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

      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      const fileName = `${req.user._id}-${Date.now()}-${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);

      // Upload file
      await blockBlobClient.upload(req.file.buffer, req.file.size, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });

      // Update user's storage usage
      const fileSizeInMB = bytesToMB(req.file.size);
      // await req.user.updateUsage("storage", fileSizeInMB);

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

// Multiple files upload with limit checking
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

      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      const uploadResults = [];
      let totalSizeInMB = 0;

      // Upload each file
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

      // Update user's storage usage
      await req.user.updateUsage("storage", totalSizeInMB);

      // Get updated storage stats
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

// Get storage usage stats
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